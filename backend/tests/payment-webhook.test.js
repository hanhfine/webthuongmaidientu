// File kiểm thử tự động toàn diện cho tính năng thanh toán VietQR Webhook
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setup, resetDb, teardown, app, createUser, loginAs, createProduct, placeOrder } from './helpers.js';
import { config } from '../src/config.js';
import { Order } from '../src/models/Order.js';
import { PaymentTransaction } from '../src/models/PaymentTransaction.js';

// Khởi động kết nối MongoDB replica set trước khi chạy test
before(setup);
// Xóa sạch cơ sở dữ liệu trước mỗi kịch bản test để đảm bảo độc lập
beforeEach(resetDb);
// Ngắt kết nối MongoDB sau khi toàn bộ test hoàn tất
after(teardown);

const SECRET = config.vietqrWebhookSecret;

// -----------------------------------------------------------------------------
// NHÓM 1: KIỂM THỬ BẢO MẬT VÀ VALIDATION (OWASP A07 & A03)
// -----------------------------------------------------------------------------

test('1. Bị từ chối 401 Unauthorized nếu thiếu hoặc sai secret key (x-api-key)', async () => {
  // Gửi request thiếu header x-api-key -> Bắt buộc phải bị từ chối 401
  const resNoKey = await request(app)
    .post('/api/webhooks/vietqr')
    .send({ gateway: 'MBBank', transactionId: 'TX001', amount: 500000 });
  assert.equal(resNoKey.status, 401);

  // Gửi request với secret key sai -> Bắt buộc phải bị từ chối 401
  const resWrongKey = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', 'sai-mat-khau-roi')
    .send({ gateway: 'MBBank', transactionId: 'TX001', amount: 500000 });
  assert.equal(resWrongKey.status, 401);
});

test('2. Bị từ chối 400 Bad Request nếu dữ liệu payload gửi sang sai định dạng', async () => {
  // Gửi thiếu trường gateway và transactionId
  const resMissing = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', SECRET)
    .send({ amount: 500000 });
  assert.equal(resMissing.status, 400);

  // Gửi số tiền âm hoặc số tiền thập phân -> Zod phải chặn lại
  const resNegative = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', SECRET)
    .send({ gateway: 'MBBank', transactionId: 'TX002', amount: -50000 });
  assert.equal(resNegative.status, 400);
});

// -----------------------------------------------------------------------------
// NHÓM 2: KIỂM THỬ NGHIỆP VỤ THANH TOÁN VÀ TOÀN VẸN DỮ LIỆU
// -----------------------------------------------------------------------------

test('3. Thanh toán thành công: đơn chuyển sang paid và confirmed, lưu log giao dịch', async () => {
  // Chuẩn bị: Tạo khách hàng và đơn hàng chuyển khoản (500k + 30k ship = 530k)
  const { user } = await loginAs();
  const product = await createProduct({ price: 500_000 });
  const order = await placeOrder(user, [[product, 1]], { paymentMethod: 'bank' });

  // Hành động: SePay bắn webhook xác nhận chuyển khoản 530.000đ kèm mã đơn hàng
  const res = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', SECRET)
    .send({
      gateway: 'MBBank',
      transactionId: 'TX_SUCCESS_123',
      amount: 530_000,
      content: `ORDER ${order._id}`,
    });

  // Đối chiếu: Webhook trả về 200 OK
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  // Đối chiếu trong DB: Đơn hàng phải chuyển sang paid và confirmed, có thời điểm paidAt
  const updatedOrder = await Order.findById(order._id);
  assert.equal(updatedOrder.paymentStatus, 'paid');
  assert.equal(updatedOrder.status, 'confirmed');
  assert.ok(updatedOrder.paidAt instanceof Date);

  // Đối chiếu trong DB: Bản ghi PaymentTransaction phải được lưu đầy đủ
  const tx = await PaymentTransaction.findOne({ gatewayTransactionId: 'TX_SUCCESS_123' });
  assert.ok(tx);
  assert.equal(tx.status, 'success');
  assert.equal(tx.amount, 530_000);
  assert.equal(tx.orderId.toString(), order._id.toString());
});

test('4. Hỗ trợ nhận diện mã đơn hàng dạng ngắn DH + 8 ký tự hex cuối', async () => {
  const { user } = await loginAs();
  const product = await createProduct({ price: 200_000 });
  const order = await placeOrder(user, [[product, 1]], { paymentMethod: 'bank' });

  // Mã ngắn dạng DH + 8 ký tự hex đuôi (ví dụ: DH12345678)
  const shortContent = `DH${String(order._id).slice(-8).toUpperCase()}`;

  const res = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', SECRET)
    .send({
      gateway: 'Vietcombank',
      transactionId: 'TX_SHORT_CODE_456',
      amount: order.total,
      content: shortContent,
    });

  assert.equal(res.status, 200);
  const updated = await Order.findById(order._id);
  assert.equal(updated.paymentStatus, 'paid');
});

test('5. Tính Idempotency: Bắn lại giao dịch cũ không bị xử lý lần 2', async () => {
  const { user } = await loginAs();
  const product = await createProduct({ price: 100_000 });
  const order = await placeOrder(user, [[product, 1]], { paymentMethod: 'bank' });

  const payload = {
    gateway: 'MBBank',
    transactionId: 'TX_REPLAY_789',
    amount: order.total,
    content: `ORDER ${order._id}`,
  };

  // Lần 1: Thành công
  const res1 = await request(app).post('/api/webhooks/vietqr').set('x-api-key', SECRET).send(payload);
  assert.equal(res1.status, 200);

  // Lần 2 (bắn lại cùng transactionId): Phải trả 200 và thông báo đã xử lý trước đó
  const res2 = await request(app).post('/api/webhooks/vietqr').set('x-api-key', SECRET).send(payload);
  assert.equal(res2.status, 200);
  assert.match(res2.body.message, /đã được xử lý/);

  // Chỉ có đúng 1 bản ghi giao dịch trong cơ sở dữ liệu
  const count = await PaymentTransaction.countDocuments({ gatewayTransactionId: 'TX_REPLAY_789' });
  assert.equal(count, 1);
});

test('6. Khách chuyển thiếu tiền: Đơn giữ nguyên pending, ghi cảnh báo vào adminNote', async () => {
  const { user } = await loginAs();
  const product = await createProduct({ price: 500_000 }); // Đơn cần 530k
  const order = await placeOrder(user, [[product, 1]], { paymentMethod: 'bank' });

  // Khách chỉ chuyển 50.000đ
  const res = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', SECRET)
    .send({
      gateway: 'MBBank',
      transactionId: 'TX_UNDERPAID_000',
      amount: 50_000,
      content: `ORDER ${order._id}`,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, false);

  // Đơn hàng KHÔNG được đổi thành paid
  const checkOrder = await Order.findById(order._id);
  assert.equal(checkOrder.paymentStatus, 'pending');
  // Phải có dòng cảnh báo cho Admin
  assert.match(checkOrder.adminNote, /CẢNH BÁO: Khách chuyển thiếu tiền/);

  // Giao dịch lưu trạng thái failed
  const tx = await PaymentTransaction.findOne({ gatewayTransactionId: 'TX_UNDERPAID_000' });
  assert.equal(tx.status, 'failed');
  assert.equal(tx.failureReason, 'AMOUNT_UNDERPAID');
});

test('7. Khách chuyển dư tiền: Đơn duyệt thành công, ghi chú tiền thừa vào adminNote', async () => {
  const { user } = await loginAs();
  const product = await createProduct({ price: 500_000 }); // Đơn cần 530k
  const order = await placeOrder(user, [[product, 1]], { paymentMethod: 'bank' });

  // Khách chuyển dư thành 600.000đ (thừa 70.000đ)
  const res = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', SECRET)
    .send({
      gateway: 'MBBank',
      transactionId: 'TX_OVERPAID_111',
      amount: 600_000,
      content: `ORDER ${order._id}`,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  // Đơn hàng vẫn được duyệt thành công
  const checkOrder = await Order.findById(order._id);
  assert.equal(checkOrder.paymentStatus, 'paid');
  assert.equal(checkOrder.status, 'confirmed');

  // Kiểm tra adminNote có ghi nhận tiền thừa
  assert.match(checkOrder.adminNote, /LƯU Ý: Khách chuyển DƯ TIỀN/);
  assert.match(checkOrder.adminNote, /70000đ/);
});

test('8. Nội dung chuyển khoản không có mã đơn: Ghi nhận ignored, không làm sập server', async () => {
  const res = await request(app)
    .post('/api/webhooks/vietqr')
    .set('x-api-key', SECRET)
    .send({
      gateway: 'Techcombank',
      transactionId: 'TX_NO_ORDER_ID',
      amount: 1_000_000,
      content: 'Nguyen Van A chuyen tien mua hang',
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const tx = await PaymentTransaction.findOne({ gatewayTransactionId: 'TX_NO_ORDER_ID' });
  assert.equal(tx.status, 'ignored');
  assert.equal(tx.failureReason, 'ORDER_NOT_FOUND_OR_INVALID_CONTENT');
});

// -----------------------------------------------------------------------------
// NHÓM 3: KIỂM THỬ API POLLING CHO KHÁCH HÀNG (GET /orders/:id/payment-status)
// -----------------------------------------------------------------------------

test('9. API Polling: Khách chỉ được xem trạng thái đơn của mình, chặn người khác (OWASP A01)', async () => {
  const { agent: clientA, user: userA } = await loginAs();
  const { agent: clientB } = await loginAs();

  const product = await createProduct();
  const orderA = await placeOrder(userA, [[product, 1]], { paymentMethod: 'bank' });

  // Khách chưa đăng nhập -> 401
  const resUnauth = await request(app).get(`/api/orders/${orderA._id}/payment-status`);
  assert.equal(resUnauth.status, 401);

  // Khách B cố tình xem trộm trạng thái đơn của Khách A -> Bị chặn 403 Forbidden
  const resForbidden = await clientB.get(`/api/orders/${orderA._id}/payment-status`);
  assert.equal(resForbidden.status, 403);

  // Khách A xem đơn của chính mình -> Thành công 200 OK
  const resSuccess = await clientA.get(`/api/orders/${orderA._id}/payment-status`);
  assert.equal(resSuccess.status, 200);
  assert.equal(resSuccess.body.paymentStatus, 'pending');
});
