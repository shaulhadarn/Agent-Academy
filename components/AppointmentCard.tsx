
import React from 'react';
import { Appointment } from '../types';

interface AppointmentCardProps {
  appointment: Appointment;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  return (
    <div className="relative bg-pink-50 border-2 border-black p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group hover:rotate-1 transition-transform">
      <div className="absolute -top-4 -right-2 text-3xl transform rotate-12 group-hover:scale-110 transition-transform">📍</div>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-white rounded-full border-2 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          🩺
        </div>
        <div>
          <h4 className="font-black text-lg text-pink-600">{appointment.title}</h4>
          <div className="flex items-center gap-1 text-xs font-bold text-gray-700 mt-1">
            <span>📅</span> {appointment.date}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-gray-500 mt-1">
            <span>🏨</span> {appointment.location}
          </div>
        </div>
      </div>
      
      {/* Decorative dots to make it look like a sticker/card */}
      <div className="absolute bottom-2 right-4 flex gap-1">
        <div className="w-2 h-2 rounded-full bg-pink-200"></div>
        <div className="w-2 h-2 rounded-full bg-pink-300"></div>
        <div className="w-2 h-2 rounded-full bg-pink-400"></div>
      </div>
    </div>
  );
};

export default AppointmentCard;
