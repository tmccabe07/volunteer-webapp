#Objective:

The volunteer webapp is intended to run as a webapp and support cub scouts volunteer management activities. Goal is to incentivize more parents to contribute through volunteering, and simplify administrative overhead of managing administrative tasks.

#User Journeys:

##Volunteer profile management
As a  volunteer, I can set up a profile for myself that includes my name, email, phone, and volunteer role.  Volunteer role by default should be parent/guardian volunteer.  Additional roles can be committee or den leader. If I select committee role, I should be able to select a specialty like chair, fundraising, treasurer, outdoor, recruiting, new member, communications, training.  If I select den leader or assistant den leader, I should be able to select a rank like lion, tiger, wolf, bear, webelos or aol.  I can also select assistant cub master, lion guide, or scouter reserve.  I can have more than one volunteer role.  

##Volunteer gamification
As a volunteer, I can earn points and image badges when I perform a volunteer activity.  If I am a committee or den leader, I automatically get 100 points.  If I am a parent volunteer, and I help with an event, then I get a certain number of points; for example, planning a den meeting gets 5 points, supporting an activity in a den meeting gets 5 points, planning a pack meeting or campout gets 10 points, supporting in activity in a pack event gets 10 points.  There should be different image badges every 20 points for Tier Levels like so: 

Lion Level (0-19 points) - "New Volunteer"
Tiger Level (20-39 points) - "Active Helper"
Wolf Level (40-59 points) - "Engaged Volunteer"
Bear Level (60-79 points) - "Dedicated Leader"
Webelos/AOL Level (80-99 points) - "Champion Volunteer"
Arrow of Light (100+ points) - "Master Volunteer"

##As an admin I can configure activities for point system.  I should be able to add and remove activities. Default activities list includes:

Low Effort (2-3 points):

Attending a committee meeting
Completing required training
Helping with setup/cleanup only

Medium Effort (5-8 points):

Leading a specific activity or station
Creating activity materials
Planning a den meeting

High Effort (10-15 points):

Planning major events (pack meetings, campouts)
Recruiting new volunteers
Organizing fundraisers
Sorting and distributing awards

Special Recognition (20-25 points):

Exceptional one-time contributions
Going above and beyond on major events

##As an admin, I can reset the gamification points system annually, and keep the archived years points as historical achievements that parents can still see in their profiles. 

##As a volunteer, I should only be able to see my profile and a leaderboard, and opt into displaying my achievements on a leaderboard. 

##As an admin or den leader or assistant den leader or committee role, I should be able to create a way for volunteers to sign up to support an event, with specific activities and number of volunteers for those activities.  Volunteers should then get points added to their profiles after the event.  

##As a volunteer, I should be able to see what volunteer opportunities are coming up, and I should be able to filter that by rank level or pack level, where rank is lion, tiger, wolf, bear, webelos, aol. 

##As an admin or den leader or assistant den leader or committee role, I should be able to add administrative tasks, like complete annual med form, pay dues, complete youth protection training.  I should be able to add steps for completing these tasks that include URLs.

##As a volunteer, I should be able to see what administrative tasks apply to me, when they are due, and if I have completed them.

##As a volunteer, I can self-register an account, and an admin should be able to revoke my access if they need to.  Login will be email and password based. 

##As a volunteer, I should be able to reset my own password without an admin's help. 

##As a volunteer, I can self select one or more volunteer roles, or an admin can assign me. 

##Any volunteer with a committee or den leader affiliated role is an admin. 

##As a volunteer, I can withdraw from events that I signed up for, even after the event occurred in case I signed up but can't attend anymore or I signed up but didn't attend.

##As a volunteer, I should be able to record that I performed a volunteer role.  An admin does not need to approve that, but an admin can revoke it.  Points history should be maintained. 

##As an admin or den leader or assistant den leader or committee role, I should be able to mark an event completed for points to be awarded.  I should also be able to log volunteers performing volunteer roles if I didn't set up a sign up ahead of time.   

##As a system, the app can provide in-app notifications for achieving new badge levels or completing admin tasks. 

##As an admin, I should be able to remove volunteer profiles and revoke access if the adult is no longer with the cub scout pack.  

##As an admin or den leader or assistant den leader or committee role, I should be able to mark an event or activity as recurring. 

##As an admin or den leader or assistant den leader or committee role, I should be able to run a report that shows me either an aggregated or detailed view of volunteer participation, by rank level or pack level.

##The webapp should be mobile friendly.  

##As an admin, I should be able to configure the webapp with pack information, like name and number and current scouting year dates, and active ranks.  