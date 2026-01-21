const invoiceRoutes = (fastify, { }, done) => {
  // Create/Generate Invoice
  fastify.post('/invoices', {
    schema: {
      body: {
        type: 'object',
        required: ['invoiceNo', 'customerName', 'items'],
        properties: {
          invoiceNo: { type: 'string' },
          invoiceDate: { type: 'string' },
          customerName: { type: 'string' },
          customerAddress: { type: 'string' },
          customerPhone: { type: 'string' },
          customerEmail: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['description', 'quantity', 'rate'],
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                rate: { type: 'number' }
              }
            }
          },
          bankDetails: {
            type: 'object',
            properties: {
              accountNo: { type: 'string' },
              accountName: { type: 'string' },
              bankName: { type: 'string' },
              branchName: { type: 'string' },
              ifscCode: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { items, ...invoiceData } = request.body;
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
      const cgst = subtotal * 0.09;
      const sgst = subtotal * 0.09;
      const total = subtotal + cgst + sgst;

      // Add calculated amounts to items
      const itemsWithAmount = items.map(item => ({
        ...item,
        amount: item.quantity * item.rate
      }));

      const invoice = {
        ...invoiceData,
        items: itemsWithAmount,
        subtotal,
        cgst,
        sgst,
        total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Here you would typically save to database
      // For now, we'll just return the invoice data
      
      return reply.send({
        success: true,
        data: invoice,
        message: 'Invoice created successfully'
      });
    } catch (error) {
      fastify.log.error('Error creating invoice:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Get all invoices
  fastify.get('/invoices', async (request, reply) => {
    try {
      // Here you would typically fetch from database
      // For now, return empty array
      return reply.send({
        success: true,
        data: [],
        message: 'Invoices retrieved successfully'
      });
    } catch (error) {
      fastify.log.error('Error fetching invoices:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Get invoice by ID
  fastify.get('/invoices/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Here you would typically fetch from database
      // For now, return not found
      return reply.status(404).send({
        success: false,
        message: 'Invoice not found'
      });
    } catch (error) {
      fastify.log.error('Error fetching invoice:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Update invoice
  fastify.put('/invoices/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          customerName: { type: 'string' },
          customerAddress: { type: 'string' },
          customerPhone: { type: 'string' },
          customerEmail: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                rate: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      
      // Here you would typically update in database
      // For now, return success
      return reply.send({
        success: true,
        message: 'Invoice updated successfully'
      });
    } catch (error) {
      fastify.log.error('Error updating invoice:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Delete invoice
  fastify.delete('/invoices/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Here you would typically delete from database
      // For now, return success
      return reply.send({
        success: true,
        message: 'Invoice deleted successfully'
      });
    } catch (error) {
      fastify.log.error('Error deleting invoice:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  done();
};

module.exports = invoiceRoutes;
