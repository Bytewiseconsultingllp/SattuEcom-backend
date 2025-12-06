const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema(
  {
    report_types: [{
      type: String,
      enum: [
        'sales', 
        'orders', 
        'customers', 
        'profit-loss', 
        'revenue', 
        'expenses', 
        'tax',
        'monthly-performance',
        'quarterly-financial',
        'annual-business'
      ],
      required: true
    }],
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      required: true
    },
    email_recipients: [{
      type: String,
      required: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    }],
    formats: [{
      type: String,
      enum: ['PDF', 'Excel', 'CSV'],
      required: true
    }],
    next_run: {
      type: Date,
      required: true
    },
    last_run: {
      type: Date,
      default: null
    },
    is_active: {
      type: Boolean,
      default: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying
reportScheduleSchema.index({ next_run: 1, is_active: 1 });

module.exports = mongoose.model('ReportSchedule', reportScheduleSchema);
