import React from 'react';
import { Award } from 'lucide-react';

interface CertificateTemplateProps {
  studentName: string;
  eventName: string;
  issuedDate: string;
}

export const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  studentName,
  eventName,
  issuedDate,
}) => {
  return (
    <div className="bg-gradient-to-br from-background via-primary/5 to-accent/10 p-8 rounded-lg border-4 border-primary/20 shadow-elegant">
      <div className="text-center space-y-6">
        {/* University Logo/Header */}
        <div className="flex justify-center mb-4">
          <Award className="h-16 w-16 text-primary" />
        </div>
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">Certificate of Participation</h1>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"></div>
        </div>

        {/* University Name */}
        <div>
          <p className="text-lg text-muted-foreground">This is to certify that</p>
        </div>

        {/* Student Name */}
        <div className="py-4">
          <h2 className="text-3xl font-bold text-foreground border-b-2 border-primary/30 inline-block px-8 pb-2">
            {studentName}
          </h2>
        </div>

        {/* Event Details */}
        <div className="space-y-2">
          <p className="text-lg text-muted-foreground">
            has successfully participated in
          </p>
          <h3 className="text-2xl font-semibold text-primary px-4">
            {eventName}
          </h3>
        </div>

        {/* University Name */}
        <div className="pt-4">
          <p className="text-lg text-muted-foreground">organized by</p>
          <h3 className="text-2xl font-bold text-foreground mt-2">
            Graphic Era Hill University
          </h3>
        </div>

        {/* Issue Date */}
        <div className="pt-6">
          <p className="text-sm text-muted-foreground">
            Issued on: {new Date(issuedDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Decorative Border */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-primary/30 rounded-tl-lg"></div>
        <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-primary/30 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-primary/30 rounded-bl-lg"></div>
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-primary/30 rounded-br-lg"></div>
      </div>
    </div>
  );
};
