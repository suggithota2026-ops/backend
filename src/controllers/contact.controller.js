// Contact controller
const ContactMessage = require('../models/contact.model');
const User = require('../models/user.model');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { createNotification } = require('../services/notification.service');
const { NOTIFICATION_TYPES } = require('../config/constants');
const { sendOTP } = require('../services/otp.service');

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

// POST /api/admin/contact-messages/:id/accept (Admin only)
const acceptEnquiry = async (request, reply) => {
  try {
    const { id } = request.params;

    // Find the contact message
    const message = await ContactMessage.findByPk(id);
    if (!message) {
      return sendError(reply, 'Contact message not found', 404);
    }

    // Check if hotel already exists
    const existingHotel = await User.findOne({
      where: { mobileNumber: message.contactNumber }
    });

    if (existingHotel) {
      return sendError(reply, 'A hotel with this contact number already exists', 400);
    }

    // Create hotel account
    const newHotel = await User.create({
      mobileNumber: message.contactNumber,
      hotelName: message.hotelName,
      address: `${message.address}, ${message.landmark ? message.landmark + ', ' : ''}${message.city}, ${message.pinCode}`,
      isVerified: true,
      role: 'hotel',
      creditLimit: 0,
      isBlocked: false,
    });

    // Update enquiry status to accepted
    await message.update({ status: 'resolved', notes: `Accepted on ${new Date().toISOString()}. Hotel ID: ${newHotel.id}` });

    // Send SMS notification
    try {
      await sendOTP(message.contactNumber, null, {
        message: `🎉 Congratulations! Welcome to the PRK Smiles family! Your hotel "${message.hotelName}" has been successfully registered. Download our app to start ordering. Team PRK Smiles`
      });
    } catch (smsError) {
      logger.error('Error sending welcome SMS:', smsError);
      // Don't fail the request if SMS fails
    }

    logger.info(`Enquiry ${id} accepted. Hotel account created: ${newHotel.id} - ${message.hotelName}`);

    return sendSuccess(
      reply,
      {
        hotel: {
          id: newHotel.id,
          hotelName: newHotel.hotelName,
          mobileNumber: newHotel.mobileNumber,
        },
        enquiry: message,
      },
      'Enquiry accepted successfully. Hotel account created and welcome message sent!',
      201
    );
  } catch (error) {
    logger.error('Error accepting enquiry:', error);
    return sendError(reply, 'Failed to accept enquiry', 500);
  }
};

// POST /api/admin/contact-messages/:id/reject (Admin only)
const rejectEnquiry = async (request, reply) => {
  try {
    const { id } = request.params;
    const { reason } = request.body;

    const message = await ContactMessage.findByPk(id);
    if (!message) {
      return sendError(reply, 'Contact message not found', 404);
    }

    // Update status to rejected and add reason to notes
    const rejectNotes = `Rejected on ${new Date().toISOString()}.${reason ? ` Reason: ${reason}` : ''}`;
    await message.update({
      status: 'resolved',
      notes: message.notes ? `${message.notes}\n\n${rejectNotes}` : rejectNotes
    });

    // Optional: Send rejection SMS
    try {
      await sendOTP(message.contactNumber, null, {
        message: `Thank you for your interest in PRK Smiles. Unfortunately, we are unable to proceed with your registration at this time. For queries, please contact our support. Team PRK Smiles`
      });
    } catch (smsError) {
      logger.error('Error sending rejection SMS:', smsError);
    }

    logger.info(`Enquiry ${id} rejected - ${message.hotelName}`);

    return sendSuccess(reply, message, 'Enquiry rejected successfully');
  } catch (error) {
    logger.error('Error rejecting enquiry:', error);
    return sendError(reply, 'Failed to reject enquiry', 500);
  }
};

module.exports = {
  sendMessage,
  getContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage,
  acceptEnquiry,
  rejectEnquiry,
};
