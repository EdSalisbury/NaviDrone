"use strict";

var bebop = require('node-bebop');
var express = require('express');
var ON_DEATH = require('death');

var drone = bebop.createClient();
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

var jsonParser = bodyParser.json()

var port = process.env.PORT || 4242;

drone.connect();

var start_lat = 0;
var start_long = 0;

var cur_wp = 0;

var latitude;
var longitude;
var heading_offset = 0;
var last_latitude = 0;
var last_longitude = 0;
var initial = true;
var waypoints = [];
var flying = false;
var turning_threshold = 20;
var forward_threshold = 24; // 2 feet
var max_height = 84; // 7 feet
var min_height = 24; // 2 feet
var desired_height = 48; // 4 feet
var counter = 0;
var max_counter = 20;
var going_up = false;
var going_down = false;
var up_counter = 0;

ON_DEATH(function(signal, err)
{
    console.log("Emergency!");
    drone.land();
    drone.emergency();
    process.exit();
});

drone.on("PositionChanged", function(data) {
         latitude = data.latitude;
         longitude = data.longitude;
    console.log("Location: " + data.latitude + ", " + data.longitude);
});

function get_bearing(currLat, currLong, destLat, destLong)
{
    var x, y;
    x = (Math.cos((destLat * Math.PI) / 180)) *
        (Math.sin((Math.abs(destLong - currLong) * Math.PI) / 180));

    y = Math.cos((currLat * Math.PI) / 180) *
        Math.sin((destLat * Math.PI) / 180) -
        (Math.sin((currLat * Math.PI) / 180) *
            Math.cos((destLat * Math.PI) / 180) *
            Math.cos((Math.abs(destLong - currLong) * Math.PI) / 180));

    var bearing = (Math.atan2(x, y) * 180) / Math.PI;

    if (bearing > 180)
        bearing -= 360;

    return (bearing);
}

function get_heading(mag)
{
    var heading = ((Math.atan2(mag.y, mag.x) * 180) / Math.PI) - heading_offset;
    return heading;
}

function get_waypoints(latitude, longitude)
{
    var waypoints = [[latitude + 0.0001, longitude],
                     [latitude + 0.0001, longitude + 0.0001],
                     [latitude, longitude + 0.0001],
                     [latitude, longitude]];
    return waypoints;
}

app.listen(4242, function () {
  console.log('Listening on port 4242!');
});

app.post('/api', function(req, res) {
    var forward = req.body.forward;
    var altitude = req.body.bottom;
    var mag = req.body.mag;

    if (latitude == 500)
    {
        console.log("Waiting for GPS fix");
        res.send("ACK");
        return;
    }

    if (initial && latitude && longitude)
    {
        heading_offset = get_heading(mag);
        console.log("Offset has been set to " + heading_offset);
        start_lat = latitude;
        start_long = longitude;
        console.log("Starting location set: " + start_lat + ", " + start_long);
        waypoints = get_waypoints(latitude, longitude);
        console.log("Setting waypoints");
        console.log(waypoints[cur_wp][0])
        console.log(waypoints[cur_wp][1])
        initial = false;
    }

    if (!initial)
    {
        var heading = get_heading(mag);
        var dest_lat = waypoints[cur_wp][0];
        var dest_long = waypoints[cur_wp][1];
        var bearing = get_bearing(latitude, longitude, dest_lat, dest_long);

        if (altitude > 12)
        {
            flying = true;
        }

        if (!flying)
        {
            console.log("Taking off");
            //drone.takeOff();
        }

        console.log("Location: " + latitude + ", " + longitude);
        console.log("Heading: " + heading);
        console.log("Bearing: " + bearing);

        if (bearing - heading >= turning_threshold)
        {
            console.log("Turning clockwise");
            //drone.clockwise(10);
            setTimeout(function() {
                drone.stop();
            }, 1000);
        }

        if (bearing - heading <= -turning_threshold)
        {
            console.log("Turning counter-clockwise");
            //drone.counterClockwise(10);
                setTimeout(function() {
                drone.stop();
            }, 1000);
        }


        if (Math.abs(bearing - heading) < turning_threshold)
        {
            //if (forward < forward_threshold)
            //{
            //    console.log("Obstacle detected");
            //    if (altitude < max_height)
            //    {
                    //console.log("Going up");
            //        up_counter++;
                    // drone.up(5);
                    //setTimeout(function() {
                    //    drone.stop();
                    //}, 1000);
            //        going_up = true;
            //    }
            //    else
            //    {
            //        console.log("Max height reached -- landing");
            //        drone.land();
            //    }
            //}
            //else
            //{
                if (going_up)
                {
                    counter = 0;
                }

                if (!going_down)
                {
                    console.log("Going straight");
                    counter++;
                    //drone.forward(20);
                    setTimeout(function() {
                        drone.stop();
                    }, 1000);
                }
           // }
        }

        if (altitude < min_height)
        {
            console.log("Resetting counter");
            counter = 0;
        }

        if (counter > max_counter)
        {
            console.log("Max counter reached");
            if (Math.abs(desired_height - altitude) > 6)
            {
                going_down = true;
                console.log("Going down");
                // drone.down(10);
                setTimeout(function() {
                    drone.stop();
                }, 1000);
            }
            else
            {
                console.log("Desired height reached");
                counter = 0;
                going_down = false;
            }
        }

        if (Math.abs(latitude - dest_lat) < .00001 && Math.abs(longitude - dest_long) < .00001)
        {
            console.log("Waypoint reached");
            drone.land();
            process.exit();
            //drone.stop();
            cur_wp++;
            if (cur_wp > waypoints.length)
            {
                console.log("Circuit complete -- landing");
                // drone.land();
            }
        }
    }

    res.send("ACK");

});

