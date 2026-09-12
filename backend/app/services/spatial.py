import math
from typing import Tuple

EARTH_RADIUS_KM = 6371.0

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth in kilometers.
    Works independently of database engine (SQLite or PostgreSQL).
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 999.0
        
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = EARTH_RADIUS_KM * c
    return round(distance, 2)

def format_distance(distance_km: float) -> str:
    """
    Format distance for human-friendly hyperlocal display.
    Never exposes exact coordinates, only approximate relative distance.
    """
    if distance_km is None:
        return "Nearby"
    if distance_km < 0.1:
        return "Right next door"
    elif distance_km < 1.0:
        meters = int(distance_km * 1000)
        return f"{meters} m away"
    else:
        return f"{distance_km:.1f} km away"

def get_bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    """
    Returns (min_lat, max_lat, min_lon, max_lon) for pre-filtering database queries.
    1 deg latitude ~= 111 km
    1 deg longitude ~= 111 km * cos(latitude)
    """
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * max(0.1, math.cos(math.radians(lat))))
    
    return (
        lat - lat_delta,
        lat + lat_delta,
        lon - lon_delta,
        lon + lon_delta
    )
