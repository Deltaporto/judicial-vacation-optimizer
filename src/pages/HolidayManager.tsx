import React from 'react';
import HolidayManagerComponent from '@/components/HolidayManager';
import { Link } from 'react-router-dom';

const HolidayManagerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Planejador de Férias Judiciais</h1>
            <Link to="/" className="text-white hover:underline">
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-8 pt-24">
        <HolidayManagerComponent
          onHolidaysUpdated={() => {
            // Recarregar dados do aplicativo se necessário
            console.log('Feriados atualizados com sucesso');
          }}
        />
      </main>
      
      <footer className="bg-gray-200 p-4 mt-8">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          <p>Planejador de Férias Judiciais - Gerencie seus feriados com facilidade</p>
        </div>
      </footer>
    </div>
  );
};

export default HolidayManagerPage; 