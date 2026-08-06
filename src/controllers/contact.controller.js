// Contact controller
const ContactMessage = require('../models/contact.model');
const User = require('../models/user.model');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');
const { createNotification } = require('../services/notification.service');
const { NOTIFICATION_TYPES } = require('../config/constants');
const { sendOTP } = require('../services/otp.service');
const {
  normalizeMobileNumber,
  userMobileWhere,
  contactNumberWhere,
} = require('../utils/userMobile');

const buildEnquiryAddress = (message) => {
  const parts = [message.address];
  if (message.landmark) parts.push(message.landmark);
  if (message.city) parts.push(message.city);
  if (message.pinCode) parts.push(message.pinCode);
  return parts.filter(Boolean).join(', ');
};

async function syncHotelFromEnquiry(message) {
  const normalizedContact = normalizeMobileNumber(message.contactNumber);
  if (normalizedContact.length !== 10) return null;

  const hotel = await User.findOne({ where: userMobileWhere(normalizedContact) });
  if (!hotel) return null;

  const fullAddress = buildEnquiryAddress(message);
  await hotel.update({
    hotelName: message.hotelName,
    address: fullAddress || hotel.address,
    city: message.city || hotel.city,
    pinCode: message.pinCode || hotel.pinCode,
    latitude: message.latitude ?? hotel.latitude,
    longitude: message.longitude ?? hotel.longitude,
  });
  return hotel;
}

async function provisionCustomerFromEnquiry(message) {
  const normalizedContact = normalizeMobileNumber(message.contactNumber);
  if (normalizedContact.length !== 10) {
    throw new Error('Invalid contact number on enquiry');
  }

  let hotel = await User.findOne({ where: userMobileWhere(normalizedContact) });
  let created = false;

  if (!hotel) {
    const fullAddress = buildEnquiryAddress(message);
    hotel = await User.create({
      mobileNumber: normalizedContact,
      hotelName: message.hotelName,
      address: fullAddress,
      city: message.city,
      pinCode: message.pinCode,
      latitude: message.latitude ?? null,
      longitude: message.longitude ?? null,
      isVerified: true,
      role: 'hotel',
      creditLimit: 0,
      isBlocked: false,
      rateType: 'Daily Price',
      pricePerUnit: null,
    });
    created = true;
  } else if (hotel.mobileNumber !== normalizedContact) {
    hotel.mobileNumber = normalizedContact;
    await hotel.save();
  }

  return { hotel, created, normalizedContact };
}

// POST /api/contact/send-message
const sendMessage = async (request, reply) => {
  try {
    const {
      hotelName,
      contactNumber: rawContactNumber,
      address,
      city,
      pinCode,
      landmark,
      email,
      message,
      latitude,
      longitude,
    } = request.body;

    const contactNumber = String(rawContactNumber || '').replace(/\D/g, '').slice(-10);
    if (contactNumber.length !== 10) {
      return sendError(reply, 'Contact number must be 10 digits', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: userMobileWhere(contactNumber) });
    if (existingUser) {
      if (existingUser.isBlocked) {
        return sendError(reply, 'Your account has been blocked. Please contact support.', 403);
      }
      return sendError(reply, 'Account already exists with this mobile number. Please login to continue.', 400);
    }

    // Check for pending enquiry
    const pendingEnquiry = await ContactMessage.findOne({
      where: {
        ...contactNumberWhere(contactNumber),
        status: 'pending',
      },
    });

    if (pendingEnquiry) {
      return sendError(reply, 'A request with this mobile number is already pending. We will review it shortly.', 400);
    }

    // Create contact message
    const contactMessage = await ContactMessage.create({
      hotelName: String(hotelName).trim(),
      contactNumber,
      address: String(address).trim(),
      city: city ? String(city).trim() : null,
      pinCode: pinCode ? String(pinCode).trim() : null,
      landmark: landmark ? String(landmark).trim() : null,
      email: email ? String(email).trim() : null,
      message: message && String(message).trim()
        ? String(message).trim()
        : 'Registration submitted from mobile app',
      latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
      longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
      status: 'pending',
    });

    const displayCity = contactMessage.city || 'N/A';
    const displayMessage = contactMessage.message;

    // Send notification to admins
    try {
      await createNotification({
        type: NOTIFICATION_TYPES.ADMIN_MESSAGE || 'admin_message',
        title: 'New Contact Message 📩',
        message: `New inquiry from ${contactMessage.hotelName}

Contact: ${contactNumber}
City: ${displayCity}

Message: ${displayMessage.substring(0, 100)}${displayMessage.length > 100 ? '...' : ''}`,
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
      'Registration submitted successfully. Admin will approve your account shortly.',
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
    const {
      status,
      notes,
      hotelName,
      contactNumber: rawContactNumber,
      address,
      city,
      pinCode,
      landmark,
      email,
      message,
    } = request.body;

    const contactMessage = await ContactMessage.findByPk(id);
    if (!contactMessage) {
      return sendError(reply, 'Contact message not found', 404);
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (hotelName !== undefined) updateData.hotelName = String(hotelName).trim();
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (city !== undefined) updateData.city = city ? String(city).trim() : null;
    if (pinCode !== undefined) updateData.pinCode = pinCode ? String(pinCode).trim() : null;
    if (landmark !== undefined) updateData.landmark = landmark ? String(landmark).trim() : null;
    if (email !== undefined) updateData.email = email ? String(email).trim() : null;
    if (message !== undefined) updateData.message = message ? String(message).trim() : null;

    if (rawContactNumber !== undefined) {
      const normalized = String(rawContactNumber || '').replace(/\D/g, '').slice(-10);
      if (normalized.length !== 10) {
        return sendError(reply, 'Contact number must be 10 digits', 400);
      }
      updateData.contactNumber = normalized;
    }

    await contactMessage.update(updateData);
    await contactMessage.reload();

    let hotel = null;
    if (status === 'resolved') {
      const provisioned = await provisionCustomerFromEnquiry(contactMessage);
      hotel = provisioned.hotel;
      const note = provisioned.created
        ? `Customer account created (ID: ${hotel.id}) on ${new Date().toISOString()}.`
        : `Linked to existing customer (ID: ${hotel.id}) on ${new Date().toISOString()}.`;
      await contactMessage.update({
        notes: contactMessage.notes ? `${contactMessage.notes}\n${note}` : note,
      });
    } else if (
      hotelName !== undefined ||
      address !== undefined ||
      city !== undefined ||
      pinCode !== undefined ||
      landmark !== undefined ||
      email !== undefined ||
      message !== undefined ||
      rawContactNumber !== undefined
    ) {
      hotel = await syncHotelFromEnquiry(contactMessage);
    }

    return sendSuccess(
      reply,
      {
        message: contactMessage,
        hotel: hotel
          ? {
              id: hotel.id,
              hotelName: hotel.hotelName,
              mobileNumber: hotel.mobileNumber,
            }
          : null,
      },
      status === 'resolved'
        ? 'Enquiry resolved and customer account is ready in Customers list.'
        : 'Enquiry updated successfully'
    );
  } catch (error) {
    logger.error('Error updating contact message:', error);
    return sendError(reply, error.message || 'Failed to update contact message', 500);
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

    const { hotel: newHotel, created } = await provisionCustomerFromEnquiry(message);

    await message.update({
      status: 'resolved',
      notes: message.notes
        ? `${message.notes}\n\nAccepted on ${new Date().toISOString()}. Hotel ID: ${newHotel.id}`
        : `Accepted on ${new Date().toISOString()}. Hotel ID: ${newHotel.id}`,
    });

    if (created) {
      try {
        await sendOTP(newHotel.mobileNumber, null, {
          message: `🎉 Congratulations! Welcome to the PRK Smiles family! Your hotel "${message.hotelName}" has been successfully registered. Download our app to start ordering. Team PRK Smiles`,
        });
      } catch (smsError) {
        logger.error('Error sending welcome SMS:', smsError);
      }
    }

    logger.info(
      `Enquiry ${id} accepted. Hotel account ${created ? 'created' : 'linked'}: ${newHotel.id} - ${message.hotelName}`
    );

    return sendSuccess(
      reply,
      {
        hotel: {
          id: newHotel.id,
          hotelName: newHotel.hotelName,
          mobileNumber: newHotel.mobileNumber,
          address: newHotel.address,
          city: newHotel.city,
          pinCode: newHotel.pinCode,
          rateType: newHotel.rateType,
        },
        enquiry: message,
        created,
      },
      created
        ? 'Enquiry accepted. Customer created — check Customers list.'
        : 'Enquiry accepted. Customer already existed and is now linked.',
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
