import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type OpportunityType = 'Full-time job' | 'Part-time job' | 'Internship' | 'Freelance';
export type WorkMode = 'Remote' | 'On-site' | 'Hybrid';
export type OpportunityStatus = 'pending' | 'approved' | 'rejected';

export interface IOpportunity extends Document {
  title: string;
  company: string;
  companyLogo: string;
  description: string;
  skills: string[];
  type: OpportunityType;
  workMode: WorkMode;
  location: string;
  stipend: string;
  isPaid: boolean;
  applicationUrl: string;
  deadline: Date | null;
  status: OpportunityStatus;
  isSample: boolean;
  submittedBy: Types.ObjectId | null;
  reviewedBy: Types.ObjectId | null;
  reviewNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const opportunitySchema = new Schema<IOpportunity>(
  {
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    companyLogo: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    skills: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: ['Full-time job', 'Part-time job', 'Internship', 'Freelance'],
      required: true,
    },
    workMode: {
      type: String,
      enum: ['Remote', 'On-site', 'Hybrid'],
      required: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: 100,
    },
    stipend: {
      type: String,
      trim: true,
      default: 'Unpaid',
      maxlength: 80,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    applicationUrl: {
      type: String,
      required: [true, 'Application URL is required'],
      trim: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isSample: {
      type: Boolean,
      default: false,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

opportunitySchema.index({ status: 1, createdAt: -1 });
opportunitySchema.index({ type: 1, workMode: 1, status: 1 });
opportunitySchema.index({ title: 'text', company: 'text', location: 'text' });

export const OpportunityModel =
  mongoose.models.Opportunity || mongoose.model<IOpportunity>('Opportunity', opportunitySchema);
