const express = require("express");
const path = require("path"); // Add this line
// Import child_process to run python code
const { exec } = require("child_process");
const { MongoClient } = require("mongodb");
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Serve HTML files from the 'public/html' directory
app.use(express.static(path.join(__dirname, "public/html")));

// MongoDB Connection URL
const url = "mongodb://localhost:27017";
const client = new MongoClient(url, { useUnifiedTopology: true });
const dbName = "fitbit";

// Connect to MongoDB once and reuse the connection
async function main() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);

    /////////// BR - Breathing Rate
    app.get("/api/br", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      const today = new Date(); // Gets the current date and time
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("br_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
              fullSleepBr: { $gt: 5, $lt: 20 },
              remSleepBr: { $gt: 5, $lt: 20 },
              deepSleepBr: { $gt: 5, $lt: 20 },
              lightSleepBr: { $gt: 5, $lt: 20 },
            },
          },
          {
            $project: {
              date: 1,
              fullSleepBr: 1,
              remSleepBr: 1,
              deepSleepBr: 1,
              lightSleepBr: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Breathing Rate data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching Breathing Rate data: ", error);
        res
          .status(500)
          .send("Error fetching Breathing Rate data: " + error.message);
      }
    });

    /////////// HR - Heart Rate
    app.get("/api/hr", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        let today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        let todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999); // End of today
    
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
    
        try {
            const collection = db.collection("hr_intraday_by_date");
            const pipeline = [
            {
                $match: {
                date: {
                    $gte: startDate.toISOString().substring(0, 10),
                    $lte: endDate.toISOString().substring(0, 10),
                },
                },
            },
            {
                $unwind: "$measurements",
            },
            {
                $project: {
                date: 1,
                restingHeartRate: 1,
                dateTime: "$measurements.dateTime",
                heartRate: "$measurements.heartRate",
                _id: 0,
                },
            },
            ];
            const data = await collection.aggregate(pipeline).toArray();
            console.log(
            `HR data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
                data.length
            }`
            );
            res.json(
            data.map((item) => ({
                dateTime: item.dateTime, // Now a formatted string
                heartRate: item.heartRate,
                restingHeartRate: item.restingHeartRate,
            }))
            );
        } catch (error) {
            console.error("Error fetching HR data: ", error);
            res.status(500).send("Error fetching HR data: " + error.message);
        }
        });

    /////////// HR - Heart Rate Zones
    app.get("/api/hr_zones", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hr_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$hrZones",
          },
          {
            $project: {
              date: 1,
              restingHeartRate: 1,
              dailyAverage: 1,
              hrBinRange: "$hrZones.hrBinRange",
              count: "$hrZones.count",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `HR Zones data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(
          data.map((item) => ({
            date: item.date,
            restingHeartRate: item.restingHeartRate,
            dailyAverage: item.dailyAverage,
            hrBinRange: item.hrBinRange,
            count: item.count,
          }))
        );
      } catch (error) {
        console.error("Error fetching HR Zones data: ", error);
        res.status(500).send("Error fetching HR Zones data: " + error.message);
      }
    });

    /////////// HRV
    app.get("/api/hrv", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hrv_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$measurements",
          },
          {
            $project: {
              date: 1,
              dailyAverageRmssd: 1,
              dateTime: "$measurements.dateTime",
              rmssd: "$measurements.rmssd",
              rmssdBinRange: "$measurements.rmssdBinRange",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `HRV data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching HRV data: ", error);
        res.status(500).send("Error fetching HRV data: " + error.message);
      }
    });

    /////////// HRV by document date
    app.get("/api/hrv_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hrv_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
              dailyMaxRmssd: {
                $lt: 125,
              },
            },
          },
          {
            $project: {
              date: 1,
              dailyAverageRmssd: 1,
              dailyMaxRmssd: 1,
              dailyMinRmssd: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `HRV daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching HRV daily data: ", error);
        res.status(500).send("Error fetching HRV daily data: " + error.message);
      }
    });

    /////////// Sleeplog
    app.get("/api/sleeplog", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("sleeplog_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $facet: {
              data: [
                { $unwind: "$levels.data" },
                {
                  $addFields: {
                    segment_end_time: {
                      $dateAdd: {
                        startDate: { $toDate: "$levels.data.dateTime" },
                        unit: "second",
                        amount: "$levels.data.seconds",
                      },
                    },
                    segment_start_time: { $toDate: "$levels.data.dateTime" },
                    level: "$levels.data.level",
                    seconds: "$levels.data.seconds",
                  },
                },
                {
                  $project: {
                    segment_start_time: 1,
                    segment_end_time: 1,
                    level: 1,
                    seconds: 1,
                  },
                },
              ],
              shortData: [
                { $unwind: "$levels.shortData" },
                {
                  $addFields: {
                    segment_end_time: {
                      $dateAdd: {
                        startDate: { $toDate: "$levels.shortData.dateTime" },
                        unit: "second",
                        amount: "$levels.shortData.seconds",
                      },
                    },
                    segment_start_time: {
                      $toDate: "$levels.shortData.dateTime",
                    },
                    level: { $concat: ["short_", "$levels.shortData.level"] },
                    seconds: "$levels.shortData.seconds",
                  },
                },
                {
                  $project: {
                    segment_start_time: 1,
                    segment_end_time: 1,
                    level: 1,
                    seconds: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              allData: { $concatArrays: ["$data", "$shortData"] },
            },
          },
          {
            $unwind: "$allData",
          },
          {
            $replaceRoot: { newRoot: "$allData" },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Sleeplog data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );

        res.json(data);
      } catch (error) {
        console.error("Error fetching Sleeplog data: ", error);
        res.status(500).send("Error fetching Sleeplog data: " + error.message);
      }
    });

    // Sleeplog Daily
    app.get("/api/sleeplog_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("sleeplog_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              minutesAsleep: 1,
              minutesAwake: 1,
              minutesToFallAsleep: 1,
              minutesAfterWakeup: 1,
              timeInBed: 1,
              startTime: 1,
              endTime: 1,
              efficiency: 1,
              duration: 1,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Sleeplog daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );

        res.json(data);
      } catch (error) {
        console.error("Error fetching Sleeplog daily data: ", error);
        res
          .status(500)
          .send("Error fetching Sleeplog daily data: " + error.message);
      }
    });

    /////////// SpO2 by measurement datetime
    app.get("/api/spo2", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("spo2_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$measurements",
          },
          {
            $project: {
              date: 1,
              dailyAvg: 1,
              dateTime: "$measurements.dateTime",
              spo2: "$measurements.spo2",
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `SpO2 data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching SpO2 data: ", error);
        res.status(500).send("Error fetching SpO2 data: " + error.message);
      }
    });

    /////////// SpO2 by document date
    app.get("/api/spo2_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("spo2_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              dailyAvg: 1,
              dailyMax: 1,
              dailyMin: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `SpO2 daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching SpO2 daily data: ", error);
        res
          .status(500)
          .send("Error fetching SpO2 daily data: " + error.message);
      }
    });

    /////////// Steps Hourly and Cumulative
    app.get("/api/steps_hourly", async (req, res) => {
      let { start, end } = req.query;
      const startDate = start
        ? new Date(start)
        : new Date(new Date().setHours(0, 0, 0, 0));
      const endDate = end
        ? new Date(end)
        : new Date(new Date().setHours(23, 59, 59, 999));

      try {
        const collection = db.collection("steps_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $unwind: "$measurements",
          },
          {
            $project: {
                date: 1,
                totalSteps: 1,
                hourGt250Steps: 1,
                hour: { $hour: "$measurements.dateTime" },
                steps: "$measurements.steps",
              },
          },
          {
            $group: {
                _id: {
                  date: "$date",
                  hour: "$hour",
                },
                steps: { $sum: "$steps" },
                totalSteps: { $first: "$totalSteps" },
                hourGt250Steps: { $first: "$hourGt250Steps" },
            },
          },
          {
            $sort: { "_id.date": 1, "_id.hour": 1 },
          },
          {
            $project: {
              _id: 0,
              date: "$_id.date",
              hour: "$_id.hour",
              dateTime: {
                $concat: ["$_id.date", " ",{ $toString: "$_id.hour" }, ":00:00"]
              },
              steps: 1,
              totalSteps: 1,
              hourGt250Steps: 1,
            },
        },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Steps Hourly data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(calculateCumulativeSteps(data));
      } catch (error) {
        console.error("Error fetching Steps Hourly data: ", error);
        res
          .status(500)
          .send("Error fetching Steps Hourly data: " + error.message);
      }
    });

    function calculateCumulativeSteps(data) {
        let cumulative = 0;
        let currentDate = "";
        let results = [];
      
        data.forEach((item, index) => {
          // Use the new date field directly
          const dateStr = item.date;
          if (currentDate !== dateStr) {
            if (currentDate !== "") {
              // Insert a null entry at the end of the previous day
              results.push({
                dateTime: `${currentDate} 23:59:00`,
                date: null,
                steps: null,
                totalSteps: null,
                hourGt250Steps: null,
                cumulativeSteps: null,
                cumulativeStepsPct: null,
              });
            }
            currentDate = dateStr;
            cumulative = 0; // Reset cumulative total for a new date
          }
      
          cumulative += item.steps;
      
          // Calculate cumulative steps percentage
          const cumulativeStepsPct =
            item.totalSteps > 0
              ? Math.ceil((cumulative / item.totalSteps) * 100)
              : 0;
      
          results.push({
            dateTime: item.dateTime, // Use the dateTime field we created in the pipeline
            date: item.date,
            steps: item.steps,
            totalSteps: item.totalSteps,
            hourGt250Steps: item.hourGt250Steps,
            cumulativeSteps: cumulative,
            cumulativeStepsPct: cumulativeStepsPct,
          });
      
          // Handle the last item to add a null at the end of the last date
          if (index === data.length - 1) {
            results.push({
              dateTime: `${dateStr} 23:59:00`,
              date: null,
              steps: null,
              totalSteps: null,
              hourGt250Steps: null,
              cumulativeSteps: null,
              cumulativeStepsPct: null,
            });
          }
        });
      
        return results;
      }

    /////////// Steps Daily
    app.get("/api/steps_daily", async (req, res) => {
      let { start, end } = req.query;
      const startDate = start
        ? new Date(start)
        : new Date(new Date().setHours(0, 0, 0, 0));
      const endDate = end
        ? new Date(end)
        : new Date(new Date().setHours(23, 59, 59, 999));

      try {
        const collection = db.collection("steps_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              totalSteps: 1,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `Steps Daily data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(
          data.map((item) => ({
            date: item.date,
            totalSteps: item.totalSteps,
          }))
        );
      } catch (error) {
        console.error("Error fetching Steps Daily data: ", error);
        res
          .status(500)
          .send("Error fetching Steps Daily data: " + error.message);
      }
    });

    /////////// RHR - Resting Heart Rate
    app.get("/api/hr_daily", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("hr_intraday_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
              // dailyMin: {
              //   $gt: 39,
              // },
            },
          },
          {
            $project: {
              date: 1,
              restingHeartRate: 1,
              dailyAverage: 1,
              dailyMax: 1,
              dailyMin: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `RHR data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(
          data.map((item) => ({
            date: item.date,
            restingHeartRate: item.restingHeartRate,
            dailyAverage: item.dailyAverage,
            dailyMax: item.dailyMax,
            dailyMin: item.dailyMin,
          }))
        );
      } catch (error) {
        console.error("Error fetching RHR data: ", error);
        res.status(500).send("Error fetching RHR data: " + error.message);
      }
    });

    /////////// VO2Max
    app.get("/api/vo2max", async (req, res) => {
      let { start, end } = req.query;
      // Set defaults to today's date if not provided
      let today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      let todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : todayEnd;

      try {
        const collection = db.collection("vo2max_by_date");
        const pipeline = [
          {
            $match: {
              date: {
                $gte: startDate.toISOString().substring(0, 10),
                $lte: endDate.toISOString().substring(0, 10),
              },
            },
          },
          {
            $project: {
              date: 1,
              vo2MaxHigh: 1,
              vo2MaxLow: 1,
              _id: 0,
            },
          },
        ];
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `VO2 Max data from ${startDate.toISOString()} to ${endDate.toISOString()}. Records: ${
            data.length
          }`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching VO2 Max data: ", error);
        res.status(500).send("Error fetching VO2 Max data: " + error.message);
      }
    });

    // Route to execute a Python script
    app.get("/run-python", (req, res) => {
      // Specify the path to the Python executable in the virtual environment
      const pythonExecutable =
        "C:\\Users\\bb\\Anaconda3\\envs\\venvFitbit\\python.exe";

      exec(
        `${pythonExecutable} -m etl.get_all_data`,
        { cwd: "../" },
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Execution error: ${error}`);
            return res.status(500).send("Failed to run the script.");
          }
          if (stderr) {
            console.error(`Script error: ${stderr}`);
            return res.status(500).send("Script encountered an error.");
          }
          res.send("Script execution completed successfully.");
          console.log(`Script success: ${stdout}`);
        }
      );
    });

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

main();
