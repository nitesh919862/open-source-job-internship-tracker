import { CheckCircle2, Clock, FileCheck2, Send, Users, XCircle } from 'lucide-react';
import type { ApplicationStatus, OpportunityStatus } from '../types';

export function ApplicationStatusLabel({ status }: { status: ApplicationStatus }) {
  switch (status) {
    case 'Applied':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 whitespace-nowrap">
          <Send className="h-3.5 w-3.5 text-blue-700" />
          Applied
        </span>
      );
    case 'Interview':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 whitespace-nowrap">
          <Users className="h-3.5 w-3.5 text-amber-600" />
          Interview
        </span>
      );
    case 'Shortlisted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-800 whitespace-nowrap">
          <FileCheck2 className="h-3.5 w-3.5 text-indigo-700" />
          Shortlisted
        </span>
      );
    case 'Selected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Selected
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-800 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 text-red-600" />
          Rejected
        </span>
      );
  }
}

export function SubmissionStatusLabel({ status }: { status: OpportunityStatus }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Approved
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          Pending Review
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-800 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 text-red-600" />
          Rejected
        </span>
      );
  }
}
