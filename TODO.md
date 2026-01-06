# Landmark Dropdown Feature Implementation

## Backend Tasks
- [x] Create a new endpoint `/api/customer/landmarks` in customer_routes.py to fetch nearby landmarks
- [x] Add mock landmark data (buildings, malls, etc.) with coordinates
- [x] Implement distance calculation using haversine_distance utility
- [x] Return landmarks within 100 meters, sorted by distance

## Frontend Tasks
- [ ] Add getNearbyLandmarks method to mapService.js
- [ ] Update orderPage.jsx to fetch nearby landmarks when user location is available
- [ ] Replace the landmark text input with a dropdown component
- [ ] Implement dropdown with nearby landmarks (within 100m)
- [ ] Set default value to the closest landmark
- [ ] Allow manual input option if no landmarks found or user prefers custom input
- [ ] Handle loading states and errors for landmark fetching

## Integration Tasks
- [ ] Ensure LocationContext is used to get user location
- [ ] Update cart state to handle landmark selection
- [ ] Pass selected landmark to payment page
