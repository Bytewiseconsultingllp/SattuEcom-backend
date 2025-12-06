const mongoose = require('mongoose');

const reportHistorySchema = new mongoose.Schema(
  {
    report_type: {
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
    },
    format: {
      type: String,
      enum: ['PDF', 'Excel', 'CSV'],
      required: true
    },
    date_range: {
      start_date: Date,
      end_date: Date,
      label: String // e.g., "Last 30 Days", "This Month"
    },
    file_url: {
      type: String,
      default: null
    },
    file_size: {
      type: Number, // in bytes
      default: 0
    },
    generated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    is_scheduled: {
      type: Boolean,
      default: false
    },
    schedule_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportSchedule',
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    error_message: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
reportHistorySchema.index({ generated_by: 1, createdAt: -1 });
reportHistorySchema.index({ report_type: 1, createdAt: -1 });

module.exports = mongoose.model('ReportHistory', reportHistorySchema);
