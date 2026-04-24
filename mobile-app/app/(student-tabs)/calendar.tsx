import React from 'react';
// We import the exact calendar file you already built in the auth folder
import SharedAuthCalendar from '../(auth)/calendar'; 

export default function StudentCalendarRoute() {
  // We simply render that imported file here. 
  // It acts as a mirror reflecting the auth calendar into the student tab.
  return <SharedAuthCalendar />; 
}