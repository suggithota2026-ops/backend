// Standard API responses

const sendSuccess = (reply, data = null, message = 'Success', statusCode = 200) => {
  return reply.status(statusCode).send({
    success: true,
    message,
    data,
  });
};

const sendError = (reply, message = 'Error', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return reply.status(statusCode).send(response);
};

const sendValidationError = (reply, errors) => {
  let firstMessage = null;
  if (Array.isArray(errors) && errors.length > 0) {
    firstMessage = errors[0]?.message || errors[0]?.msg || null;
  } else if (errors && typeof errors === 'object' && errors.message) {
    firstMessage = errors.message;
  }
  return sendError(reply, firstMessage || 'Validation failed', 422, errors);
};

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
};
