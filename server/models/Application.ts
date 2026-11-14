import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ApplicationStatus = 'Applied' | 'Interview' | 'Shortlisted' | 'Selected' | 'Rejected';

export interface IApplicationHistoryEntry {
  status: ApplicationStatus;
  note: string;
  changedAt: Date;
}

export interface IApplication extends Document {
  userId: Types.ObjectId;
  opportunityId: Types.ObjectId | null;
  customTitle: string;
  customCompany: string;
  customUrl: string;
  status: ApplicationStatus;
  appliedAt: Date;
  notes: string;
  history: IApplicationHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const historyEntrySchema = new Schema<IApplicationHistoryEntry>(
  {
    status: {
      type: String,
      enum: ['Applied', 'Interview', 'Shortlisted', 'Selected', 'Rejected'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const applicationSchema = new Schema<IApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null,
    },
    customTitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: 140,
    },
    customCompany: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },
    customUrl: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Applied', 'Interview', 'Shortlisted', 'Selected', 'Rejected'],
      default: 'Applied',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    history: {
      type: [historyEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ userId: 1, opportunityId: 1 });
applicationSchema.index({ userId: 1, status: 1, appliedAt: -1 });

export const ApplicationModel =
  mongoose.models.Application || mongoose.model<IApplication>('Application', applicationSchema);
