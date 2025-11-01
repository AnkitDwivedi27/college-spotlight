import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttendanceEmailRequest {
  teacherName: string;
  teacherEmail: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  organizerName: string;
  presentStudents: Array<{
    name: string;
    rollNumber: string;
    email: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      teacherName,
      teacherEmail,
      eventName,
      eventDate,
      eventTime,
      organizerName,
      presentStudents,
    }: AttendanceEmailRequest = await req.json();

    console.log("Sending attendance email to:", teacherEmail);

    const studentListHTML = presentStudents
      .map(
        (student, index) =>
          `<li>${index + 1}. ${student.name} (Roll: ${student.rollNumber}) - ${student.email}</li>`
      )
      .join("");

    const emailResponse = await resend.emails.send({
      from: "College Event System <onboarding@resend.dev>",
      to: [teacherEmail],
      subject: `Attendance List for Event "${eventName}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Attendance Report</h2>
          
          <p>Dear ${teacherName},</p>
          
          <p>Below is the list of students who attended the event <strong>"${eventName}"</strong> 
          held on <strong>${eventDate}</strong> at <strong>${eventTime}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #444; margin-top: 0;">Present Students (${presentStudents.length})</h3>
            <ol style="padding-left: 20px;">
              ${studentListHTML}
            </ol>
          </div>
          
          <p style="margin-top: 30px;">
            <strong>Organizer:</strong> ${organizerName}<br/>
            <strong>Department:</strong> Graphic Era Hill University
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          
          <p style="color: #666; font-size: 12px;">
            This is an automated email from the College Event Management System.<br/>
            Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-attendance-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
