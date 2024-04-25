const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static("public"));

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

    app.get("/api/br", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        const today = new Date();  // Gets the current date and time
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);   
        
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
      
        console.log(`Fetching Breathing Rate data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
      
        try {
          const collection = db.collection("br_by_date");
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
                fullSleepBr: 1,
                remSleepBr: 1,
                deepSleepBr: 1,
                lightSleepBr: 1,
                _id: 0,
              },
            },
          ];
          console.log("Executing Breathing Rate aggregation pipeline...");
          const data = await collection.aggregate(pipeline).toArray();
          console.log(
            `Breathing Rate data aggregation complete. Number of records fetched: ${data.length}`
          );
      
          res.json(data);
        } catch (error) {
          console.error("Error fetching Breathing Rate data: ", error);
          res.status(500).send("Error fetching Breathing Rate data: " + error.message);
        }
      });

    app.get("/api/hr", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        let today = new Date();
        today.setHours(0, 0, 0, 0);  // Start of today
        let todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);  // End of today
      
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
      
        console.log(`Fetching Heart Rate data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

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
              dateTime: {
                $dateFromString: {
                  dateString: "$measurements.dateTime",
                },
              },
              heartRate: "$measurements.heartRate",
              restingHeartRate: 1,
            },
          },
          {
            $group: {
                _id: {
                    $subtract: [
                        { $toDate: "$dateTime" },
                        { $mod: [{ $toLong: { $toDate: "$dateTime" }}, 30000] }
                    ]
                },
                heartRate: {
                    $max: "$heartRate"
                },
                restingHeartRate: {
                    $first: "$restingHeartRate"
                },
            }
          },
          {
            $project: {
              dateTime: {
                $dateToString: { format: "%Y-%m-%dT%H:%M:%S", date: "$_id" },
              },
              heartRate: { $round: ["$heartRate"] },
              restingHeartRate: 1,
            },
          },
          {
            $sort: { dateTime: 1 }, // Sort by minute ascending
          },
        ];
        console.log("Executing HR aggregation pipeline...");
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `HR data aggregation complete. Number of records fetched: ${data.length}`
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

    app.get("/api/rhr", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        let today = new Date();
        today.setHours(0, 0, 0, 0);  // Start of today
        let todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);  // End of today
      
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
      
        console.log(`Fetching Resting Heart Rate data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

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
              $project: {
                date: 1,
                restingHeartRate: 1,
                _id: 0,
              },
            },
          ];
        console.log("Executing RHR aggregation pipeline...");
        const data = await collection.aggregate(pipeline).toArray();
        console.log(data);
        console.log(
          `RHR data aggregation complete. Number of records fetched: ${data.length}`
        );
        res.json(
          data.map((item) => ({
            date: item.date,
            restingHeartRate: item.restingHeartRate,
          }))
        );
      } catch (error) {
        console.error("Error fetching RHR data: ", error);
        res.status(500).send("Error fetching RHR data: " + error.message);
      }
    });

    app.get("/api/spo2", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        let today = new Date();
        today.setHours(0, 0, 0, 0);  // Start of today
        let todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);  // End of today
      
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
      
        console.log(`Fetching SpO2 data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
      
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
              dailyAverage: 1,
              dateTime: "$measurements.dateTime",
              spo2: "$measurements.spo2",
              _id: 0,
            },
          },
        ];
        console.log("Executing SpO2 aggregation pipeline...");
        const data = await collection.aggregate(pipeline).toArray();
        console.log(
          `SpO2 data aggregation complete. Number of records fetched: ${data.length}`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching SpO2 data: ", error);
        res.status(500).send("Error fetching SpO2 data: " + error.message);
      }
    });

    app.get("/api/hrv", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        let today = new Date();
        today.setHours(0, 0, 0, 0);  // Start of today
        let todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);  // End of today
      
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
      
        console.log(`Fetching HRV data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);

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
            $match: {
              "measurements.rmssd": { $lt: 125 },
            },
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
          `HRV data aggregation complete. Number of records fetched: ${data.length}`
        );
        res.json(data);
      } catch (error) {
        console.error("Error fetching HRV data: ", error);
        res.status(500).send("Error fetching HRV data: " + error.message);
      }
    });

    app.get("/api/sleeplog", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        let today = new Date();
        today.setHours(0, 0, 0, 0);  // Start of today
        let todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);  // End of today
      
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
      
        console.log(`Fetching Sleep Log data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
      
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
                      segment_start_time: { $toDate: "$levels.shortData.dateTime" },
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
          console.log("Executing Sleeplog aggregation pipeline...");
          const data = await collection.aggregate(pipeline).toArray();
          console.log(
            `Sleeplog data aggregation complete. Number of records fetched: ${data.length}`
          );
      
          res.json(data);
        } catch (error) {
          console.error("Error fetching Sleeplog data: ", error);
          res.status(500).send("Error fetching Sleeplog data: " + error.message);
        }
      });

      app.get("/api/vo2max", async (req, res) => {
        let { start, end } = req.query;
        // Set defaults to today's date if not provided
        let today = new Date();
        today.setHours(0, 0, 0, 0);  // Start of today
        let todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);  // End of today
      
        const startDate = start ? new Date(start) : today;
        const endDate = end ? new Date(end) : todayEnd;
      
        console.log(`Fetching VO2 Max data from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
      
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
          console.log("Executing VO2 Max aggregation pipeline...");
          const data = await collection.aggregate(pipeline).toArray();
          console.log(
            `VO2 Max data aggregation complete. Number of records fetched: ${data.length}`
          );
      
          res.json(data);
        } catch (error) {
          console.error("Error fetching VO2 Max data: ", error);
          res.status(500).send("Error fetching VO2 Max data: " + error.message);
        }
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
