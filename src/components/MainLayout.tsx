// ... existing code ...
            <VacationRecommendations 
              vacationPeriod={selectedVacationPeriod}
              onRecommendationSelect={(dateRange, recommendationType, recommendation) => 
                handleRecommendationSelect(dateRange, recommendationType, recommendation)
              }
              ref={recommendationsRef}
            />
// ... existing code ...