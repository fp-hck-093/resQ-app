# resQ App — Project Summary

## Overview
A disaster response platform connecting people in need with volunteers. Built as a Hacktiv8 final project.

---

## Tech Stack

### Backend (server/)
| Category | Tech |
|---|---|
| Runtime | Node.js |
| Framework | NestJS 11 |
| API Layer | GraphQL code-first (`@nestjs/graphql` + Apollo Server 5) |
| ORM | Mongoloquent 3 + `@mongoloquent/nestjs` |
| Database | MongoDB |
| Auth | JWT (`@nestjs/jwt` + Passport) |
| File Upload | Multer + Cloudinary |
| Password | bcryptjs |
| Email | Nodemailer |
| Language | TypeScript 5 |

### Client (app/)
| Category | Tech |
|---|---|
| Framework | React Native (Expo ~54) |
| Language | JavaScript (JSX) |
| API Client | Apollo Client 4 |
| Navigation | React Navigation 7 (Native Stack + Bottom Tabs) |
| UI Library | React Native Paper |
| Maps | react-native-maps |
| Storage | AsyncStorage + expo-secure-store |
| Location | @react-native-community/geolocation |
| Image Picker | react-native-image-picker |

### External APIs
| API | Purpose | Interval |
|---|---|---|
| WeatherAPI.com | Current weather conditions (rain, wind, visibility) | On-demand (mutation) |
| BMKG Nowcast RSS | Indonesian official weather alerts | Auto-poll every 15 min |
| BMKG TEWS | Latest earthquake data | Auto-poll every 5 min |

---

## Collections (dbdiagram.io)

```
Table users {
  _id string [pk]
  name string
  email string [unique]
  password string [note: 'hashed with bcryptjs']
  phone string
  avatarUrl string [note: 'Cloudinary URL']
  role string [note: 'user / volunteer / admin']
  createdAt datetime
  updatedAt datetime
}

Table requests {
  _id string [pk]
  userId string [ref: > users._id]
  title string
  description string
  location_type string [note: 'GeoJSON type = Point']
  location_coordinates float[] [note: '[longitude, latitude]']
  status string [note: 'pending / in_progress / completed']
  volunteerIds string[] [note: 'ref to users']
  createdAt datetime
  updatedAt datetime
}

Table activity_logs {
  _id string [pk]
  volunteerId string [ref: > users._id]
  requestId string [ref: > requests._id]
  status string [note: 'active / completed / cancelled']
  createdAt datetime
  updatedAt datetime
}

Table locations {
  _id string [pk]
  userId string [ref: > users._id]
  label string [note: 'e.g. Home, Office']
  location_type string [note: 'GeoJSON type = Point']
  location_coordinates float[] [note: '[longitude, latitude]']
  notificationsEnabled boolean
  createdAt datetime
  updatedAt datetime
}

Table weather_logs {
  _id string [pk]
  city string
  location_type string [note: 'GeoJSON type = Point']
  location_coordinates float[] [note: '[longitude, latitude]']
  condition string [note: 'e.g. Partly cloudy']
  conditionCode int
  windKph float
  precipMm float
  humidity int
  visibilityKm float
  isDangerous boolean [note: 'precipMm>=20 OR windKph>=60 OR visKm<2']
  fetchedAt datetime
  createdAt datetime
  updatedAt datetime
}

Table bmkg_alerts {
  _id string [pk]
  identifier string [unique, note: 'CAP alert ID']
  title string
  event string [note: 'e.g. Thunderstorm']
  urgency string
  severity string [note: 'Extreme / Severe / Moderate / Minor']
  certainty string
  areaDesc string
  description string
  effective string [note: 'ISO datetime']
  expires string [note: 'ISO datetime']
  location_type string [note: 'GeoJSON type = Point']
  location_coordinates float[] [note: 'centroid of alert polygon(s)']
  alertUrl string
  isDangerous boolean [note: 'severity is Extreme/Severe/Moderate']
  fetchedAt datetime
  createdAt datetime
  updatedAt datetime
}

Table earthquake_alerts {
  _id string [pk]
  tanggal string [note: 'date from BMKG']
  jam string [note: 'time from BMKG']
  location_type string [note: 'GeoJSON type = Point']
  location_coordinates float[] [note: '[longitude, latitude]']
  magnitude float
  kedalaman string [note: 'depth']
  wilayah string [note: 'region name']
  fetchedAt datetime
  createdAt datetime
  updatedAt datetime
}
```

---

## GraphQL Operations Summary

### Auth
| Operation | Type |
|---|---|
| `register` | Mutation |
| `login` | Mutation |

### Users
| Operation | Type |
|---|---|
| `getMe` | Query |
| `updateProfile` | Mutation |
| `uploadAvatar` | REST POST |

### Requests
| Operation | Type |
|---|---|
| `getRequests` | Query |
| `getMyRequests` | Query |
| `createRequest` | Mutation |
| `deleteRequest` | Mutation |
| `completeRequest` | Mutation |
| `volunteerForRequest` | Mutation |

### Activity Logs
| Operation | Type |
|---|---|
| `getMyActivities` | Query |
| `updateActivityStatus` | Mutation |

### Locations
| Operation | Type |
|---|---|
| `getLocations` | Query |
| `addLocation` | Mutation |
| `updateLocation` | Mutation |
| `deleteLocation` | Mutation |

### Weather
| Operation | Type |
|---|---|
| `getWeatherLogs` | Query |
| `getDangerousWeather` | Query |
| `fetchWeather(latitude, longitude)` | Mutation |

### BMKG Logs
| Operation | Type |
|---|---|
| `getBmkgAlerts` | Query |
| `getActiveBmkgAlerts` | Query |
| `fetchBmkgAlerts` | Mutation |
| `getEarthquakeAlerts(limit)` | Query |
| `syncEarthquakeAlert` | Mutation |

---

## Planned / Not Yet Implemented
- Push notifications (FCM)
- Danger zones module (based on weather + requests)
- Cron for weather fetching
- Cancel request mutation
- Update request mutation
