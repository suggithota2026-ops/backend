// Contact controller
const ContactMessage = require('../models/contact.model');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { createNotification } = require('../services/notification.service');
const { NOTIFICATION_TYPES } = require('../config/constants');

// POST /api/contact/send-message
const sendMessage = async (request, reply) => {
  try {
    const {
      hotelName,
      contactNumber,
      address,
      city,
      pinCode,
      landmark,
      email,
      message,
    } = request.body;

    // Create contact message
    const contactMessage = await ContactMessage.create({
      hotelName,
      contactNumber,
      address,
      city,
      pinCode,
      landmark: landmark || null,
      email: email || null,
      message,
      status: 'pending',
    });

    // Send notification to admins
    try {
      await createNotification({
        type: NOTIFICATION_TYPES.ADMIN_MESSAGE || 'admin_message',
        title: 'New Contact Message 📩',
        message: `New inquiry from ${hotelName}

Contact: ${contactNumber}
City: ${city}

Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        recipient: null, // Broadcast to all admins
        metadata: {
          contactMessageId: contactMessage.id,
          hotelName,
          contactNumber,
          city,
          email,
        },
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Error sending contact notification:', notificationError);
    }

    logger.info(`Contact message received from ${hotelName} (${contactNumber})`);

    return sendSuccess(
      reply,
      {
        id: contactMessage.id,
        hotelName: contactMessage.hotelName,
        status: contactMessage.status,
      },
      'Message sent successfully. We will contact you soon!',
      201
    );
  } catch (error) {
    logger.error('Error creating contact message:', error);
    return sendError(reply, 'Failed to send message. Please try again.', 500);
  }
};

// GET /api/admin/contact-messages (Admin only)
const getContactMessages = async (request, reply) => {
  try {
    const { page = 1, limit = 20, status } = request.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: messages, count: total } = await ContactMessage.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    return sendSuccess(reply, {
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Contact messages retrieved successfully');
  } catch (error) {
    logger.error('Error fetching contact messages:', error);
    return sendError(reply, 'Failed to fetch contact messages', 500);
  }
};

// GET /api/admin/contact-messages/:id (Admin only)
const getContactMessage = async (request, reply) => {
  try {
    const { id } = request.params;

    const message = await ContactMessage.findByPk(id);
    if (!message) {
      return sendError(reply, 'Contact message not found', 404);
    }

    return sendSuccess(reply, message, 'Contact message retrieved successfully');
  } catch (error) {
    logger.error('Error fetching contact message:', error);
    return sendError(reply, 'Failed to fetch contact message', 500);
  }
};

// PUT /api/admin/contact-messages/:id (Admin only)
const updateContactMessage = async (request, reply) => {
  try {
    const { id } = request.params;
    const { status, notes } = request.body;

    const message = await ContactMessage.findByPk(id);
    if (!message) {
      return sendError(reply, 'Contact message not found', 404);
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await message.update(updateData);

    return sendSuccess(reply, message, 'Contact message updated successfully');
  } catch (error) {
    logger.error('Error updating contact message:', error);
    return sendError(reply, 'Failed to update contact message', 500);
  }
};

// DELETE /api/admin/contact-messages/:id (Admin only)
const deleteContactMessage = async (request, reply) => {
  try {
    const { id } = request.params;

    const message = await ContactMessage.findByPk(id);
    if (!message) {
      return sendError(reply, 'Contact message not found', 404);
    }

    await message.destroy();

    return sendSuccess(reply, null, 'Contact message deleted successfully');
  } catch (error) {
    logger.error('Error deleting contact message:', error);
    return sendError(reply, 'Failed to delete contact message', 500);
  }
};

module.exports = {
  sendMessage,
  getContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
};
