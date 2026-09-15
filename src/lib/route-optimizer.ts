import { calculateDistance } from './geo';

export interface VisitStop {
  id: string;
  doctorId: string;
  doctorName: string;
  latitude: number;
  longitude: number;
  address?: string;
  priority: 'A' | 'B' | 'C';
  estimatedDuration: number; // in minutes
  timeWindow?: {
    start: string; // HH:MM
    end: string;   // HH:MM
  };
}

export interface OptimizedRoute {
  stops: VisitStop[];
  totalDistance: number; // in meters
  totalDuration: number; // in minutes
  estimatedStartTime: string;
  estimatedEndTime: string;
}

/**
 * Nearest Neighbor / Greedy Algorithm for Visit Route Optimization
 * Starts from user's current location and finds the optimal path
 */
export function optimizeRoute(
  userLocation: { latitude: number; longitude: number },
  stops: VisitStop[],
  options: {
    startTime?: string; // HH:MM format
    maxStops?: number;
    considerPriority?: boolean;
    considerTimeWindows?: boolean;
  } = {}
): OptimizedRoute {
  const {
    startTime = '09:00',
    maxStops = stops.length,
    considerPriority = true,
    considerTimeWindows = false,
  } = options;

  if (stops.length === 0) {
    return {
      stops: [],
      totalDistance: 0,
      totalDuration: 0,
      estimatedStartTime: startTime,
      estimatedEndTime: startTime,
    };
  }

  // Sort by priority if enabled (A > B > C)
  const sortedStops = [...stops].sort((a, b) => {
    if (considerPriority) {
      const priorityOrder = { A: 0, B: 1, C: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    }
    // Then by distance from user
    const distA = calculateDistance(userLocation, { latitude: a.latitude, longitude: a.longitude });
    const distB = calculateDistance(userLocation, { latitude: b.latitude, longitude: b.longitude });
    return distA - distB;
  });

  const optimized: VisitStop[] = [];
  const remaining = [...sortedStops];
  let currentLocation = userLocation;
  let totalDistance = 0;
  let totalDuration = 0;

  // Parse start time
  const [startHour, startMinute] = startTime.split(':').map(Number);
  let currentTime = new Date();
  currentTime.setHours(startHour, startMinute, 0, 0);

  while (remaining.length > 0 && optimized.length < maxStops) {
    // Find nearest unvisited stop
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      const distance = calculateDistance(currentLocation, {
        latitude: stop.latitude,
        longitude: stop.longitude,
      });

      // Check time window if enabled
      let timeWindowPenalty = 0;
      if (considerTimeWindows && stop.timeWindow) {
        const [windowStartHour, windowStartMin] = stop.timeWindow.start.split(':').map(Number);
        const [windowEndHour, windowEndMin] = stop.timeWindow.end.split(':').map(Number);
        
        const windowStart = new Date(currentTime);
        windowStart.setHours(windowStartHour, windowStartMin, 0, 0);
        const windowEnd = new Date(currentTime);
        windowEnd.setHours(windowEndHour, windowEndMin, 0, 0);

        const travelTimeMinutes = distance / 1000 / 30 * 60; // Estimate: 30 km/h average
        const arrivalTime = new Date(currentTime.getTime() + travelTimeMinutes * 60000);

        if (arrivalTime < windowStart) {
          // Too early - add waiting time penalty
          timeWindowPenalty = (windowStart.getTime() - arrivalTime.getTime()) / 60000;
        } else if (arrivalTime > windowEnd) {
          // Too late - high penalty
          timeWindowPenalty = 1000;
        }
      }

      const score = distance + timeWindowPenalty * 1000; // Weight time windows heavily
      
      if (score < bestDistance) {
        bestDistance = score;
        bestIndex = i;
      }
    }

    const nextStop = remaining.splice(bestIndex, 1)[0];
    const distanceToStop = calculateDistance(currentLocation, {
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    });

    totalDistance += distanceToStop;
    
    // Calculate travel time (assuming 30 km/h average speed in city)
    const travelTimeMinutes = Math.round(distanceToStop / 1000 / 30 * 60);
    totalDuration += travelTimeMinutes;
    
    // Add visit duration
    totalDuration += nextStop.estimatedDuration;

    // Update current time
    currentTime = new Date(currentTime.getTime() + (travelTimeMinutes + nextStop.estimatedDuration) * 60000);
    
    currentLocation = { latitude: nextStop.latitude, longitude: nextStop.longitude };
    optimized.push(nextStop);
  }

  // Calculate return distance to start (optional)
  const returnDistance = calculateDistance(currentLocation, userLocation);
  totalDistance += returnDistance;
  const returnTravelTime = Math.round(returnDistance / 1000 / 30 * 60);
  totalDuration += returnTravelTime;

  const endTime = new Date(currentTime.getTime() + returnTravelTime * 60000);

  return {
    stops: optimized,
    totalDistance,
    totalDuration,
    estimatedStartTime: startTime,
    estimatedEndTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
  };
}

/**
 * Format route for display
 */
export function formatRoute(route: OptimizedRoute): string {
  const distanceKm = (route.totalDistance / 1000).toFixed(1);
  const hours = Math.floor(route.totalDuration / 60);
  const minutes = route.totalDuration % 60;
  const durationStr = hours > 0 ? `${hours}س ${minutes}د` : `${minutes}د`;
  
  return `المسافة: ${distanceKm} كم • المدة: ${durationStr} • ${route.estimatedStartTime} - ${route.estimatedEndTime}`;
}

/**
 * Get Google Maps navigation URL for the optimized route
 */
export function getNavigationUrl(
  userLocation: { latitude: number; longitude: number },
  stops: VisitStop[]
): string {
  const waypoints = stops.map(s => `${s.latitude},${s.longitude}`).join('|');
  const destination = stops[stops.length - 1];
  
  return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${destination.latitude},${destination.longitude}&waypoints=${waypoints}&travelmode=driving`;
}