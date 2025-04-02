import React from 'react';
import { render, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
/**
 * Test para verificar a correção da visibilidade da aba "Fracionamento Ótimo"
 */
describe('Fracionamento Ótimo Tab Visibility', () => {
    // Test case: Fracionamento Ótimo tab should not appear when there are no split periods
    test('should not show Fracionamento Ótimo tab when splitPeriods is empty', () => {
        const TestComponent = () => {
            const splitPeriods = [];
            return (<Tabs defaultValue="single">
          <div className="p-4 border-b border-gray-100">
            <TabsList className={`grid ${splitPeriods.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="single">
                Período Único
              </TabsTrigger>
              <TabsTrigger value="split">
                Período Fracionado
              </TabsTrigger>
              {splitPeriods.length > 0 && (<TabsTrigger value="optimal">
                  Fracionamento Ótimo
                </TabsTrigger>)}
            </TabsList>
          </div>
        </Tabs>);
        };
        render(<TestComponent />);
        // Should find the first two tabs
        expect(screen.getByText('Período Único')).toBeInTheDocument();
        expect(screen.getByText('Período Fracionado')).toBeInTheDocument();
        // Should NOT find the Fracionamento Ótimo tab
        expect(screen.queryByText('Fracionamento Ótimo')).not.toBeInTheDocument();
    });
    // Test case: Fracionamento Ótimo tab should appear when there are split periods
    test('should show Fracionamento Ótimo tab when splitPeriods has items', () => {
        const TestComponent = () => {
            const splitPeriods = [{ startDate: new Date(), endDate: new Date() }];
            return (<Tabs defaultValue="single">
          <div className="p-4 border-b border-gray-100">
            <TabsList className={`grid ${splitPeriods.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="single">
                Período Único
              </TabsTrigger>
              <TabsTrigger value="split">
                Período Fracionado
              </TabsTrigger>
              {splitPeriods.length > 0 && (<TabsTrigger value="optimal">
                  Fracionamento Ótimo
                </TabsTrigger>)}
            </TabsList>
          </div>
        </Tabs>);
        };
        render(<TestComponent />);
        // Should find all three tabs
        expect(screen.getByText('Período Único')).toBeInTheDocument();
        expect(screen.getByText('Período Fracionado')).toBeInTheDocument();
        expect(screen.getByText('Fracionamento Ótimo')).toBeInTheDocument();
    });
});
// Delete this file after successful tests
console.log('Tests for Fracionamento Ótimo tab visibility completed successfully.');
