import {
   OPCUAClient,
   MessageSecurityMode,
   SecurityPolicy,
   AttributeIds,
   makeBrowsePath,
   ClientSubscription,
   TimestampsToReturn,
   MonitoringParametersOptions,
   // ReadValueIdLike,
   ClientMonitoredItem,
   DataValue
} from "node-opcua";

const ENDPOINT_URL = "opc.tcp://172.30.10.2:4840";
const EWON_TAGS = [
  "ActTemperaturePIR2",
  "ActSpeedRPMEntryRoll",
  "SetPointDephaseRemote",
  "SetTemperatureWarmCylinder",
  "ActTemperatureWarmCylinder",
  "ActCountermeterTotal",
  "ActSpeedBrakeRoll",
  "ActTorqueBrakeRoll",
  "ActSpeedWebGuideRoll",
  "ActSpeedPullRoll",
  "ActSpeedCoolBelt",
  "ActTorqueWebGuideRoll",
  "ActTorquePullRoll",
  "ActTorqueWarmCylinder",
  "ActSpeedWarmCylinder",
  "SetPointDephase",
  "ActExitBeltTension",
  "ActLineSpeed",
  "ActEntryWiderTension",
  "ActPosBeltLeftPress",
  "ENB_Scheda1",
  "ENA_Scheda1",
  "ActPosBeltRightPress",
  "CycleA_Scheda1",
  "ActTorqueCoolBelt",
  "ActEncoderIn",
  "PIR_1_mA",
  "PIR_2_mA",
  "ActEncoder2",
  "ActThermo1",
  "ActThermo2",
  "ENA_Scheda2",
  "ENB_Scheda2",
  "CycleB_Scheda1",
  "CycleA_Scheda2",
  "ActThermo3",
  "ActEncoder3",
  "ENA_Scheda3",
  "ENB_Scheda3",
  "CycleB_Scheda2",
  "ActEncoder4",
  "ActEncoderOut",
  "ActSteamFlowTotal",
  "ActSteamFlow",
  "ActSteamFlowPressure",
  "ActSteamFlowTemperature",
  "SetEntryWiderTension",
  "ActTemperaturePIR1",
  "SetExitBeltTension",
  "ActTorqueFolder",
  "ActSpeedRPMWebGuideRoll",
  "ActSpeedRPMBrake",
  "ActSpeedRPMCentralCylinder",
  "ActSpeedRPMCoolingBelt",
  "ActSpeedRPMPullRoll",
  "ActSpeedRPMFolder",
  "Act_VoltageL1N",
  "Act_VoltageL2N",
  "Act_VoltageL3N",
  "Act_CurrentL1N",
  "Act_CurrentL2N",
  "Act_CurrentL3N",
  "Act_ActivePower",
  "EnableSetPointDephaseRemote",
  "CycleA_Scheda3",
  "ActSteamFlowPower",
  "SetPointSpeedRemote",
  "SetWebguideRollFeedbackType",
  "SetLineSpeed"
];

const client = OPCUAClient.create({
  applicationName: "Compas OPCUA client",
  connectionStrategy: {
    initialDelay: 1000,
    maxRetry: 1
  },
  securityMode: MessageSecurityMode.None,
  securityPolicy: SecurityPolicy.None,
  endpointMustExist: false,
});
client.on("backoff", (retry, delay) => {
  console.log("Retrying to connect to ", ENDPOINT_URL, " attempt ", retry);
});

let session: any
let subscription: any;

async function stopClient() {
  if (subscription) await subscription.terminate();
  if (session) await session.close();
  if (client) await client.disconnect();
}

(async () => {
  try {
    // step 1 : connect to
    await client.connect(ENDPOINT_URL);
    console.log("connected!");

    // step 2 : createSession
    session = await client.createSession();
    console.log("session created!");

    // step 3 : browse
    // const browseResult: any = await session.browse("RootFolder");
    
    // console.log("references of RootFolder :");
    // for(const reference of browseResult.references) {
    //   console.log( "   -> ", reference.browseName.toString());
    // }

    // step 4 : read a variable with readVariableValue
    // const dataValue2 = await session.readVariableValue("ns=4;s=ActTemperaturePIR2");
    // console.log(" value = " , dataValue2.toString());

    // step 4' : read a variable with read
    // const maxAge = 0;
    // const nodeToRead = {
    //   nodeId: "ns=4;s=ActTemperaturePIR2",
    //   attributeId: AttributeIds.Value
    // };
    // const dataValue =  await session.read(nodeToRead, maxAge);
    // console.log(" value " , dataValue.toString());

    // step 5: install a subscription and install a monitored item for 10 seconds
    subscription = ClientSubscription.create(session, {
      requestedPublishingInterval: 5000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10
    });
    
    subscription.on("started", function() {
      console.log("subscription started for 2 seconds - subscriptionId=", subscription.subscriptionId);
    }).on("keepalive", function() {
      console.log("keepalive");
    }).on("terminated", function() {
      console.log("terminated");
    });
    
    // install monitored item

    const parameters: MonitoringParametersOptions = {
      samplingInterval: 100,
      discardOldest: true,
      queueSize: 10
    };
    
    EWON_TAGS.forEach((tag) => {
      const itemToMonitor = {
        nodeId: `ns=4;s=${tag}`,
        attributeId: AttributeIds.Value
      };
      const monitoredItem = ClientMonitoredItem.create(
        subscription,
        itemToMonitor,
        parameters,
        TimestampsToReturn.Both
      );
      
      monitoredItem.on("changed", (dataValue: DataValue) => {
        console.log(`${tag} value has changed`, dataValue.value.toString());
      });
    });
    
    // async function timeout(ms: number) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }
    // await timeout(10000);
    
    // console.log("now terminating subscription");
    // await subscription.terminate();

    // // step 6: finding the nodeId of a node by Browse name
    //     const browsePath = makeBrowsePath("RootFolder", "/Objects/Server.ServerStatus.BuildInfo.ProductName");
    
    //     const result = await session.translateBrowsePath(browsePath);
    //     const productNameNodeId = result.targets[0].targetId;
    //     console.log(" Product Name nodeId = ", productNameNodeId.toString());

    // // close session
    //     await session.close();

    // // disconnecting
    //     await client.disconnect();
    //     console.log("done !");
    
    // detect CTRL+C and close
    process.on("SIGINT|SIGTERM", async () => {
      console.log("shutting down client..");

      await stopClient();
      console.log("Done");
      process.exit(0);
    });
  } catch(err) {
    console.log("An error has occured: ",err);
  }
})();