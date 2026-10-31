import { Order } from '../models/Order.js';

export async function revenue({ from, to }) {
  const byDay = await Order.aggregate([
    { $match: { status: 'delivered', paymentStatus: 'paid', deliveredAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt', timezone: 'Asia/Ho_Chi_Minh' } },
        revenue: { $sum: { $subtract: ['$total', '$shippingFee'] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
  ]);
  return {
    revenue: byDay.reduce((s, d) => s + d.revenue, 0),
    orderCount: byDay.reduce((s, d) => s + d.orders, 0),
    byDay,
  };
}
