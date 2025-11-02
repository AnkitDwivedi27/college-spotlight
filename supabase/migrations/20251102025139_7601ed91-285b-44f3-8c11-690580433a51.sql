-- Allow organizers to update attendance for their events
CREATE POLICY "Organizers can update attendance for their events"
ON event_registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_registrations.event_id
    AND events.created_by = auth.uid()
  )
);