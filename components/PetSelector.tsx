
import React from 'react';
import { Pet } from '../types';

interface PetSelectorProps {
  pets: Pet[];
  selectedPetId: string;
  onSelect: (id: string) => void;
  onAddClick: () => void;
}

const PetSelector: React.FC<PetSelectorProps> = ({ pets, selectedPetId, onSelect, onAddClick }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar items-center">
      {pets.map((pet) => (
        <button
          key={pet.id}
          onClick={() => onSelect(pet.id)}
          className={`relative group flex-shrink-0 transition-transform ${selectedPetId === pet.id ? 'scale-110' : 'scale-90 opacity-70'}`}
        >
          <div 
            className="w-16 h-16 border-4 border-black rounded-full overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white"
            style={{ borderColor: selectedPetId === pet.id ? pet.color : 'black' }}
          >
            <img src={pet.avatarUrl} alt={pet.name} className="w-full h-full object-cover" />
          </div>
          <span className={`block mt-1 text-xs font-bold ${selectedPetId === pet.id ? 'text-black' : 'text-gray-500'}`}>
            {pet.name}
          </span>
          {selectedPetId === pet.id && (
            <div className="absolute -top-1 -right-1 bg-yellow-400 border-2 border-black rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
              ⭐
            </div>
          )}
        </button>
      ))}
      <button 
        onClick={onAddClick}
        className="w-16 h-16 border-4 border-dashed border-gray-400 rounded-full flex items-center justify-center text-2xl text-gray-400 flex-shrink-0 hover:border-black hover:text-black transition-colors"
      >
        +
      </button>
    </div>
  );
};

export default PetSelector;
