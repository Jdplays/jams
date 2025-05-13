
# JAMS (Jam Administration and Management System)

JAMS has primarily been built for use by the Northern Ireland Raspberry Jam, but is generic enough to be used by anyone planning events in a similar structure like other raspberry jams, coder dojos and many more.

At its core, it is an event administration and management system which allows organisers to create event schedules, manage volunteer attendance and signup for any workshops running in the schedule. It also allows attendees to sign up to workshops.

## Current Features
- OAuth 2.0 SSO support
- Role based access control
	- Zero Trust policy
- Interactive drag and drop schedule planner
- Workshop creation and management
	- File management with ability to edit .md files
	- File versioning and ability to restore old versions
- Volunteer Attendance for each event
- Volunteer Signup for which workshops they will help in on the schedule
	- This is an interactive grid with live updates
- Attendee management with ability to add local attendees
- Eventbrite integration for various areas
	- Events
	- Attendees
		- You can configure what gets imported from your forms
- Public schedule page
- Extensive logging viewable within the app
- Stats module for live event stats along with generated post event stats. Metrics include:
	- Average Leave time
	- Average duration
	- Gender distribution
	- Age distribution
	- Check-in counts
	- Check-in trends
	- Retention Rate
	- Most popular workshops
	- Highest dropout workshops
	- Workshop Overlap
- User profile pages
- Volunteer streaks (game-ify your event)
- Live onsite name badge printing on check-in with [JOLT](https://github.com/Jdplays/jolt)
- Dark mode...

A core feature to this system is that a lot of the pages have live updating built into them. As someone adds workshops to the schedule, it live updates for everyone. This is the same for the Volunteer attendance, signups, and attendee pages

All planned and currently in development features can be seen in the GitHub project attached to this repo.

If you have any feature requests or bugs, feel free to open a discussion, create an issue, contact me or if you want, open a Pull Request.

## Software Stack
- Server - Python
	- Flask
	- Flask SqlAlchemy
- DB - PostgreSQL
- File Storage - MinIO
- Event cache layer - Redis
- Front end:
	- HTML
	- CSS
	- TypeScript (compiled into JavaScript)

## Running JAMS
JAMS has been developed with docker in mind. You can use the example docker compose and .env files in the docker folder. Once you have filled out the compose file with your settings, it should set everything up for you. The default user that it creates will be `AdminAccount` with the password `admin`. You should change this.

JAMS consists of 2 containers
- jams-server: This handles the singleton functions of JAMS like the task scheduler and websocket server
- jams-web: This handles all the web based function, from serving html and js, to accepting api requests
The two containers use both the DB and Redis to communicate

If running in production at scale, it is recommended to run this behind a reverse proxy that can handle SSL for you. Personally I use [Traefik](https://doc.traefik.io/traefik/getting-started/install-traefik/) for this. 

### Custom config
The provided docker compose file includes containers for Postgres, Redis and MinIO. However if you want to run your own DB, caching server or file storage, you can. 

The database has to be PostgreSQL. If doing this, you will need to add an environment variable in the JAMS containers called `DATABASE_URL`. This will look like this:
```env
DATABASE_URL=postgresql://username:password@address:port/jams-main
```

For Redis, as this is used as a communication layer between the two containers, it is highly recommended that this stays on the same host for both security and latency. However, you can pass your own Redis url using the `REDIS_URL` environment variable:
```env
REDIS_URL=redis://default:password@address:port
```
Note if your redis instance has a password on it, you will need to do this too

As for file storage, any S3 API compatible system should work, but this has not been tested. For that you will need to add another environment variable in the JAMS containers called `MINIO_ENDPOINT`. This will look like this:
```env
MINIO_ENDPOINT=address:port
```

I strongly recommend against doing these if you are running them on an external server to JAMS. This is because it is currently configured to use http as it is just over the docker network. I'll update this README if this changes in the future

## Future work
Like every open source piece of software, JAMS is evolving every day, with new pull requests and features. I will try to keep the README up to date, but it will probably lag behind at times.
Notable upcoming features:
- Switch SSE to use Redis instead of DB polling
- Add more SSE
- Add a finance system
- Add an inventory system
- Add a wrangler system
- COntinue to improve UI on both desktop and mobile

## Screenshots
### Schedule Planner:
![](readme_assets/schedule_planner_dark.png)

### General Settings
![](readme_assets/general_settings.png)

### Eventbrite Settings:
![](readme_assets/eventbrite_settings_page.png)

### Authentication sources Settings:
![](readme_assets/auth_sources_page.png)

### Add Event page (edit is very similar):
![](readme_assets/add_event_page.png)

### Edit Workshops page (add is very similar):
![](readme_assets/edit_workshop_page.png)

### Volunteer Attendance:
![](readme_assets/volunteer_attendance.png)

### Volunteer Signup:
![](readme_assets/volunteer_signup.png)

### Events Page:
![](readme_assets/events_page.png)

### Stats Page
![](readme_assets/stats_page.png)

### Profile Page
![](readme_assets/profile_page.png)
I have not shown all the pages that are like events. Ones like Workshops, Attendees, etc... These are all very similar. A table with data and some actions

And for those who for some reason like light more, all pages support both dark and light mode. Here is the Schedule planner as an example:
![](readme_assets/schedule_planner_light.png)
