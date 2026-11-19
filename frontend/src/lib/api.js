/**
 * Custom Error class for API responses
 */
export class ApiError extends Error {
  constructor(status, code, message, fieldErrors = null) {
    super(message || 'Đã có lỗi xảy ra');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Universal API request wrapper
 * Automatically handles credentials (httpOnly JWT cookie), JSON serialization,
 * and standard error response parsing.
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = {
    ...options.headers,
  };

  // If body is NOT FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // Crucial for sending & receiving httpOnly auth cookie
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorData = typeof data === 'object' && data !== null ? data : {};
    throw new ApiError(
      response.status,
      errorData.code || 'UNKNOWN_ERROR',
      errorData.message || response.statusText || 'Yêu cầu không thành công',
      errorData.fieldErrors || null
    );
  }

  return data;
}

export const api = {
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body }),
  put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body }),
  patch: (url, body, options = {}) => request(url, { ...options, method: 'PATCH', body }),
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
};

export default api;
