
import React, { useState } from 'react';
import { Pet, PetType } from '../types';

interface AddPetModalProps {
  onClose: () => void;
  onAdd: (pet: Pet) => void;
}

const AddPetModal: React.FC<AddPetModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PetType>('dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !breed) return;

    const newPet: Pet = {
      id: Date.now().toString(),
      name,
      type,
      age: `${age} years`,
      breed,
      avatarUrl: `https://picsum.photos/seed/${name}/200`,
      color: type === 'dog' ? '#FFD54F' : '#F06292'
    };
    onAdd(newPet);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-[#FFFDE7] w-full max-w-sm border-4 border-black wobbly-border p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">New Pal! 🦴</h2>
          <button onClick={onClose} className="text-3xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-black rounded-xl p-2 bg-white focus:outline-none focus:ring-2 ring-blue-300"
              placeholder="e.g. Fluffy"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Pet Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as PetType)}
              className="w-full border-2 border-black rounded-xl p-2 bg-white focus:outline-none"
            >
              <option value="dog">Dog 🐶</option>
              <option value="cat">Cat 🐱</option>
              <option value="rabbit">Rabbit 🐰</option>
              <option value="bird">Bird 🦜</option>
              <option value="hamster">Hamster 🐹</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Breed</label>
            <input 
              type="text" 
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full border-2 border-black rounded-xl p-2 bg-white focus:outline-none"
              placeholder="e.g. Pug"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Age (Years)</label>
            <input 
              type="number" 
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full border-2 border-black rounded-xl p-2 bg-white focus:outline-none"
              placeholder="e.g. 3"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-400 text-white font-bold py-3 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all mt-4"
          >
            Welcome Home! 🏠
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddPetModal;
