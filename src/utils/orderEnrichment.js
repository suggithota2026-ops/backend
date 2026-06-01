const User = require('../models/user.model');

const HOTEL_FIELDS = 'id hotelName mobileNumber address gstNumber';

const toPlainOrder = (order) => (order?.toObject ? order.toObject() : { ...order });

async function attachHotelsToOrders(orders) {
  const isArray = Array.isArray(orders);
  const list = isArray ? orders : [orders];

  if (list.length === 0 || !list[0]) {
    return isArray ? [] : null;
  }

  const plainOrders = list.map(toPlainOrder);
  const hotelIds = [...new Set(plainOrders.map((o) => o.hotelId).filter((id) => id != null))];

  let hotelMap = new Map();
  if (hotelIds.length > 0) {
    const hotels = await User.find({ id: { $in: hotelIds } })
      .select(HOTEL_FIELDS)
      .lean();
    hotelMap = new Map(hotels.map((h) => [h.id, h]));
  }

  const enriched = plainOrders.map((order) => ({
    ...order,
    hotel: hotelMap.get(order.hotelId) || null,
  }));

  return isArray ? enriched : enriched[0];
}

module.exports = { attachHotelsToOrders };
