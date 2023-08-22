# Copyright 2023 Google LLC. All Rights Reserved.
#
# Use of this source code is governed by an MIT-style license that can be found
# in the LICENSE file or at https://opensource.org/licenses/MIT.

from collections.abc import Mapping, Sequence
import datetime
import unittest

import two_step_routing


def _make_shipment(
    label: str,
    latlng: tuple[float, float],
    duration: str,
    allowed_vehicle_indices: list[int] | None = None,
    delivery_start: two_step_routing.TimeString | None = None,
    delivery_end: two_step_routing.TimeString | None = None,
    load_demands: Mapping[str, int] | None = None,
    cost_per_vehicle: Mapping[int, float] | None = None,
) -> two_step_routing.Shipment:
  delivery = {
      "arrivalWaypoint": {
          "location": {
              "latLng": {
                  "latitude": latlng[0],
                  "longitude": latlng[1],
              }
          }
      },
      "duration": duration,
  }
  time_window = None
  if delivery_start is not None:
    time_window = {}
    time_window["startTime"] = delivery_start
  if delivery_end is not None:
    time_window = time_window or {}
    time_window["endTime"] = delivery_end
  if time_window is not None:
    delivery["timeWindows"] = [time_window]
  shipment = {
      "label": label,
      "deliveries": [delivery],
  }
  if allowed_vehicle_indices is not None:
    shipment["allowedVehicleIndices"] = allowed_vehicle_indices
  if load_demands is not None:
    shipment["loadDemands"] = {
        unit: {"amount": str(amount)} for unit, amount in load_demands.items()
    }
  if cost_per_vehicle is not None:
    vehicle_indices, costs = zip(*cost_per_vehicle.items())
    shipment["costsPerVehicle"] = list(costs)
    shipment["costsPerVehicleIndices"] = list(vehicle_indices)
  return shipment


def _make_vehicle(
    label: str,
    depot_latlng: tuple[float, float],
    start_time: tuple[str, str],
    end_time: tuple[str, str],
) -> two_step_routing.Vehicle:
  return {
      "label": label,
      "travelMode": 1,
      "travelDurationMultiple": 1,
      "costPerHour": 60,
      "costPerKilometer": 1,
      "startWaypoint": {
          "location": {
              "latLng": {
                  "latitude": depot_latlng[0],
                  "longitude": depot_latlng[1],
              }
          }
      },
      "endWaypoint": {
          "location": {
              "latLng": {
                  "latitude": depot_latlng[0],
                  "longitude": depot_latlng[1],
              }
          }
      },
      "startTimeWindows": [{
          "startTime": start_time[0],
          "endTime": start_time[1],
      }],
      "endTimeWindows": [{
          "startTime": end_time[0],
          "endTime": end_time[1],
      }],
  }


class PlannerTest(unittest.TestCase):
  """Tests for the Planner class."""

  maxDiff = None

  _OPTIONS = two_step_routing.Options(
      local_model_vehicle_fixed_cost=10000,
      max_round_duration="1800s",
      min_average_shipments_per_round=2,
  )

  _REQUEST_JSON: two_step_routing.OptimizeToursRequest = {
      "model": {
          "shipments": [
              _make_shipment(  # 0
                  "S001",
                  latlng=(48.86471, 2.34901),
                  duration="120s",
                  allowed_vehicle_indices=[0],
                  cost_per_vehicle={0: 100, 1: 200},
              ),
              _make_shipment(  # 1
                  "S002",
                  latlng=(48.86593, 2.34886),
                  duration="150s",
                  allowed_vehicle_indices=[0],
              ),
              _make_shipment(  # 2
                  "S003",
                  latlng=(48.86594, 2.34887),
                  duration="60s",
                  allowed_vehicle_indices=[0],
                  delivery_start="2023-08-11T12:00:00.000Z",
              ),
              _make_shipment(  # 3
                  "S004",
                  latlng=(48.86595, 2.34888),
                  duration="60s",
                  allowed_vehicle_indices=[0],
                  delivery_start="2023-08-11T14:00:00.000Z",
                  delivery_end="2023-08-11T16:00:00.000Z",
              ),
              _make_shipment(  # 4
                  "S005",
                  latlng=(48.86596, 2.34889),
                  duration="150s",
                  allowed_vehicle_indices=[0, 1],
              ),
              _make_shipment(  # 5
                  "S006",
                  latlng=(48.86597, 2.34890),
                  duration="150s",
                  allowed_vehicle_indices=[0, 1],
                  load_demands={"wheat": 3, "ore": 2},
              ),
              _make_shipment(  # 6
                  "S007",
                  latlng=(48.86597, 2.34890),
                  duration="150s",
                  allowed_vehicle_indices=[0],
                  load_demands={"ore": 1, "wood": 5},
              ),
              _make_shipment(  # 7
                  "S008",
                  latlng=(48.86597, 2.34890),
                  duration="150s",
                  allowed_vehicle_indices=[1],
              ),
              _make_shipment(  # 8
                  "S009",
                  latlng=(48.86597, 2.34890),
                  duration="150s",
                  allowed_vehicle_indices=[0, 1],
              ),
          ],
          "vehicles": [
              _make_vehicle(
                  "V001",
                  depot_latlng=(48.86321, 2.34767),
                  start_time=(
                      "2023-08-11T08:00:00.000Z",
                      "2023-08-11T08:00:00.000Z",
                  ),
                  end_time=(
                      "2023-08-11T16:00:00.000Z",
                      "2023-08-11T21:00:00.000Z",
                  ),
              ),
              _make_vehicle(
                  "V002",
                  depot_latlng=(48.86321, 2.34767),
                  start_time=(
                      "2023-08-11T08:00:00.000Z",
                      "2023-08-11T08:00:00.000Z",
                  ),
                  end_time=(
                      "2023-08-11T20:00:00.000Z",
                      "2023-08-11T21:00:00.000Z",
                  ),
              ),
          ],
          "globalStartTime": "2023-08-11T00:00:00.000Z",
          "globalEndTime": "2023-08-12T00:00:00.000Z",
      },
      "searchMode": 1,
      "label": "my_little_model",
      "parent": "my_awesome_project",
  }
  _PARKING_LOCATIONS: Sequence[two_step_routing.ParkingLocation] = (
      two_step_routing.ParkingLocation(
          coordinates={"latitude": 48.86482, "longitude": 2.34932},
          tag="P001",
          travel_duration_multiple=1.1,
          delivery_load_limits={"ore": 2},
      ),
      two_step_routing.ParkingLocation(
          coordinates={"latitude": 48.86482, "longitude": 2.34932},
          tag="P002",
          travel_mode=2,
          delivery_load_limits={"ore": 2},
      ),
  )
  _PARKING_FOR_SHIPMENT = {
      0: "P001",
      1: "P001",
      2: "P001",
      3: "P001",
      4: "P002",
      5: "P002",
      6: "P002",
      7: "P002",
  }

  # The expected local model request created by the two-step planner for the
  # base request defined above.
  _EXPECTED_LOCAL_REQUEST_JSON: two_step_routing.OptimizeToursRequest = {
      "label": "my_little_model/local",
      "model": {
          "globalEndTime": "2023-08-12T00:00:00.000Z",
          "globalStartTime": "2023-08-11T00:00:00.000Z",
          "shipments": [
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86471,
                                  "longitude": 2.34901,
                              }
                          }
                      },
                      "duration": "120s",
                  }],
                  "label": "0: S001",
                  "allowedVehicleIndices": [0],
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86593,
                                  "longitude": 2.34886,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "1: S002",
                  "allowedVehicleIndices": [0],
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86594,
                                  "longitude": 2.34887,
                              }
                          }
                      },
                      "duration": "60s",
                  }],
                  "label": "2: S003",
                  "allowedVehicleIndices": [1],
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86595,
                                  "longitude": 2.34888,
                              }
                          }
                      },
                      "duration": "60s",
                  }],
                  "label": "3: S004",
                  "allowedVehicleIndices": [2],
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86596,
                                  "longitude": 2.34889,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "4: S005",
                  "allowedVehicleIndices": [3],
              },
              {
                  "allowedVehicleIndices": [3],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "5: S006",
                  "loadDemands": {
                      "ore": {"amount": "2"},
                      "wheat": {"amount": "3"},
                  },
              },
              {
                  "allowedVehicleIndices": [4],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "6: S007",
                  "loadDemands": {
                      "ore": {"amount": "1"},
                      "wood": {"amount": "5"},
                  },
              },
              {
                  "allowedVehicleIndices": [5],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "7: S008",
              },
          ],
          "vehicles": [
              {
                  "label": "P001 [vehicles=(0,)]/0",
                  "endWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "startWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "routeDurationLimit": {"maxDuration": "1800s"},
                  "travelDurationMultiple": 1.1,
                  "travelMode": 1,
                  "fixedCost": 10000,
                  "costPerHour": 300,
                  "costPerKilometer": 60,
                  "loadLimits": {"ore": {"maxLoad": "2"}},
              },
              {
                  "label": (
                      "P001 [start=2023-08-11T12:00:00.000Z vehicles=(0,)]/0"
                  ),
                  "endWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "startWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "startTimeWindows": [{
                      "startTime": "2023-08-11T12:00:00.000Z",
                  }],
                  "routeDurationLimit": {"maxDuration": "1800s"},
                  "travelDurationMultiple": 1.1,
                  "travelMode": 1,
                  "fixedCost": 10000,
                  "costPerHour": 300,
                  "costPerKilometer": 60,
                  "loadLimits": {"ore": {"maxLoad": "2"}},
              },
              {
                  "label": (
                      "P001 [start=2023-08-11T14:00:00.000Z"
                      " end=2023-08-11T16:00:00.000Z vehicles=(0,)]/0"
                  ),
                  "endWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "startWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "startTimeWindows": [{
                      "startTime": "2023-08-11T14:00:00.000Z",
                  }],
                  "endTimeWindows": [{
                      "endTime": "2023-08-11T16:00:00.000Z",
                  }],
                  "routeDurationLimit": {"maxDuration": "1800s"},
                  "travelDurationMultiple": 1.1,
                  "travelMode": 1,
                  "fixedCost": 10000,
                  "costPerHour": 300,
                  "costPerKilometer": 60,
                  "loadLimits": {"ore": {"maxLoad": "2"}},
              },
              {
                  "label": "P002 [vehicles=(0, 1)]/0",
                  "endWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "startWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "routeDurationLimit": {"maxDuration": "1800s"},
                  "travelDurationMultiple": 1.0,
                  "travelMode": 2,
                  "fixedCost": 10000,
                  "costPerHour": 300,
                  "costPerKilometer": 60,
                  "loadLimits": {"ore": {"maxLoad": "2"}},
              },
              {
                  "costPerHour": 300,
                  "costPerKilometer": 60,
                  "endWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "fixedCost": 10000,
                  "label": "P002 [vehicles=(0,)]/0",
                  "routeDurationLimit": {"maxDuration": "1800s"},
                  "startWaypoint": {
                      "location": {
                          "latLng": {
                              "latitude": 48.86482,
                              "longitude": 2.34932,
                          }
                      }
                  },
                  "travelDurationMultiple": 1.0,
                  "travelMode": 2,
                  "loadLimits": {"ore": {"maxLoad": "2"}},
              },
              {
                  "costPerHour": 300,
                  "costPerKilometer": 60,
                  "endWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86482, "longitude": 2.34932}
                      }
                  },
                  "fixedCost": 10000,
                  "label": "P002 [vehicles=(1,)]/0",
                  "loadLimits": {"ore": {"maxLoad": "2"}},
                  "routeDurationLimit": {"maxDuration": "1800s"},
                  "startWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86482, "longitude": 2.34932}
                      }
                  },
                  "travelDurationMultiple": 1.0,
                  "travelMode": 2,
              },
          ],
      },
      "parent": "my_awesome_project",
  }
  # An example response from the CFR solver for _EXPECTED_LOCAL_REQUEST_JSON.
  # Fields that are not needed by the two-step solver were removed from the
  # response to make it shorter.
  _LOCAL_RESPONSE_JSON: two_step_routing.OptimizeToursResponse = {
      "routes": [
          {
              "vehicleLabel": "P001 [vehicles=(0,)]/0",
              "vehicleStartTime": "2023-08-11T00:00:00Z",
              "vehicleEndTime": "2023-08-11T00:15:32Z",
              "visits": [
                  {
                      "startTime": "2023-08-11T00:02:37Z",
                      "shipmentLabel": "0: S001",
                  },
                  {
                      "shipmentIndex": 1,
                      "startTime": "2023-08-11T00:10:54Z",
                      "shipmentLabel": "1: S002",
                  },
              ],
              "transitions": [
                  {
                      "totalDuration": "157s",
                      "startTime": "2023-08-11T00:00:00Z",
                  },
                  {
                      "totalDuration": "377s",
                      "startTime": "2023-08-11T00:04:37Z",
                  },
                  {
                      "totalDuration": "128s",
                      "startTime": "2023-08-11T00:13:24Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "932s",
              },
              "routeTotalCost": 10191.306666666665,
          },
          {
              "vehicleIndex": 1,
              "vehicleLabel": (
                  "P001 [start=2023-08-11T12:00:00.000Z vehicles=(0,)]/0"
              ),
              "vehicleStartTime": "2023-08-11T12:00:00Z",
              "vehicleEndTime": "2023-08-11T12:12:04Z",
              "visits": [{
                  "shipmentIndex": 2,
                  "startTime": "2023-08-11T12:08:56Z",
                  "shipmentLabel": "2: S003",
              }],
              "transitions": [
                  {
                      "totalDuration": "536s",
                      "startTime": "2023-08-11T12:00:00Z",
                  },
                  {
                      "totalDuration": "128s",
                      "startTime": "2023-08-11T12:09:56Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "724s",
              },
              "routeTotalCost": 10174.273333333333,
          },
          {
              "vehicleIndex": 2,
              "vehicleLabel": (
                  "P001 [start=2023-08-11T14:00:00.000Z"
                  " end=2023-08-11T16:00:00.000Z vehicles=(0,)]/0"
              ),
              "vehicleStartTime": "2023-08-11T14:00:00Z",
              "vehicleEndTime": "2023-08-11T14:12:04Z",
              "visits": [{
                  "shipmentIndex": 3,
                  "startTime": "2023-08-11T14:08:56Z",
                  "shipmentLabel": "3: S004",
              }],
              "transitions": [
                  {
                      "totalDuration": "536s",
                      "startTime": "2023-08-11T14:00:00Z",
                  },
                  {
                      "totalDuration": "128s",
                      "startTime": "2023-08-11T14:09:56Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "724s",
              },
              "routeTotalCost": 10174.273333333334,
          },
          {
              "vehicleIndex": 3,
              "vehicleLabel": "P002 [vehicles=(0, 1)]/0",
              "vehicleStartTime": "2023-08-11T00:00:00Z",
              "vehicleEndTime": "2023-08-11T00:09:30Z",
              "visits": [
                  {
                      "shipmentIndex": 5,
                      "startTime": "2023-08-11T00:02:15Z",
                      "shipmentLabel": "5: S006",
                  },
                  {
                      "shipmentIndex": 4,
                      "startTime": "2023-08-11T00:04:45Z",
                      "shipmentLabel": "4: S005",
                  },
              ],
              "transitions": [
                  {
                      "totalDuration": "135s",
                      "startTime": "2023-08-11T00:00:00Z",
                  },
                  {
                      "totalDuration": "0s",
                      "startTime": "2023-08-11T00:04:45Z",
                  },
                  {
                      "totalDuration": "135s",
                      "startTime": "2023-08-11T00:07:15Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "570s",
              },
              "routeTotalCost": 10069.94,
          },
          {
              "vehicleIndex": 4,
              "vehicleLabel": "P002 [vehicles=(0,)]/0",
              "vehicleStartTime": "2023-08-11T00:00:00Z",
              "vehicleEndTime": "2023-08-11T00:06:59Z",
              "visits": [{
                  "shipmentIndex": 6,
                  "startTime": "2023-08-11T00:02:15Z",
                  "shipmentLabel": "6: S007",
              }],
              "transitions": [
                  {
                      "totalDuration": "135s",
                      "startTime": "2023-08-11T00:00:00Z",
                  },
                  {
                      "totalDuration": "134s",
                      "startTime": "2023-08-11T00:04:45Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "419s",
              },
              "routeTotalCost": 10057.356666666667,
          },
          {
              "vehicleIndex": 5,
              "vehicleLabel": "P002 [vehicles=(1,)]/0",
              "vehicleStartTime": "2023-08-11T00:00:00Z",
              "vehicleEndTime": "2023-08-11T00:06:59Z",
              "visits": [{
                  "shipmentIndex": 7,
                  "startTime": "2023-08-11T00:02:15Z",
                  "shipmentLabel": "7: S008",
              }],
              "transitions": [
                  {
                      "totalDuration": "135s",
                      "startTime": "2023-08-11T00:00:00Z",
                  },
                  {
                      "totalDuration": "134s",
                      "startTime": "2023-08-11T00:04:45Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "419s",
              },
              "routeTotalCost": 10057.356666666667,
          },
      ],
      "totalCost": 60724.506666666661,
  }

  # The expected global model request created by the two-step planner for the
  # base request defined above, using _EXPECTED_LOCAL_REQUEST_JSON as the
  # solution of the local model.
  _EXPECTED_GLOBAL_REQUEST_JSON: two_step_routing.OptimizeToursRequest = {
      "label": "my_little_model/global",
      "model": {
          "globalEndTime": "2023-08-12T00:00:00.000Z",
          "globalStartTime": "2023-08-11T00:00:00.000Z",
          "shipments": [
              {
                  "allowedVehicleIndices": [0, 1],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "s:8 S009",
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "932s",
                  }],
                  "costsPerVehicle": [100, 200],
                  "costsPerVehicleIndices": [0, 1],
                  "label": "p:0 S001,S002",
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "724s",
                      "timeWindows": [{"startTime": "2023-08-11T11:51:04Z"}],
                  }],
                  "label": "p:1 S003",
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "724s",
                      "timeWindows": [{
                          "endTime": "2023-08-11T15:50:04Z",
                          "startTime": "2023-08-11T13:51:04Z",
                      }],
                  }],
                  "label": "p:2 S004",
              },
              {
                  "allowedVehicleIndices": [0, 1],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "570s",
                  }],
                  "label": "p:3 S006,S005",
                  "loadDemands": {
                      "ore": {"amount": "2"},
                      "wheat": {"amount": "3"},
                  },
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "419s",
                  }],
                  "label": "p:4 S007",
                  "loadDemands": {
                      "ore": {"amount": "1"},
                      "wood": {"amount": "5"},
                  },
              },
              {
                  "allowedVehicleIndices": [1],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "419s",
                  }],
                  "label": "p:5 S008",
              },
          ],
          "vehicles": [
              {
                  "costPerHour": 60,
                  "costPerKilometer": 1,
                  "endTimeWindows": [{
                      "endTime": "2023-08-11T21:00:00.000Z",
                      "startTime": "2023-08-11T16:00:00.000Z",
                  }],
                  "endWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "label": "V001",
                  "startTimeWindows": [{
                      "endTime": "2023-08-11T08:00:00.000Z",
                      "startTime": "2023-08-11T08:00:00.000Z",
                  }],
                  "startWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "travelDurationMultiple": 1,
                  "travelMode": 1,
              },
              {
                  "costPerHour": 60,
                  "costPerKilometer": 1,
                  "endTimeWindows": [{
                      "endTime": "2023-08-11T21:00:00.000Z",
                      "startTime": "2023-08-11T20:00:00.000Z",
                  }],
                  "endWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "label": "V002",
                  "startTimeWindows": [{
                      "endTime": "2023-08-11T08:00:00.000Z",
                      "startTime": "2023-08-11T08:00:00.000Z",
                  }],
                  "startWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "travelDurationMultiple": 1,
                  "travelMode": 1,
              },
          ],
      },
      "parent": "my_awesome_project",
  }

  # An example response from the CFR solver for _EXPECTED_GLOBAL_REQUEST_JSON.
  # Fields that are not needed by the two-step solver were removed from the
  # response to make it shorter.
  _GLOBAL_RESPONSE_JSON: two_step_routing.OptimizeToursResponse = {
      "routes": [
          {
              "vehicleLabel": "V001",
              "vehicleStartTime": "2023-08-11T08:00:00Z",
              "vehicleEndTime": "2023-08-11T16:00:00Z",
              "visits": [
                  {
                      "startTime": "2023-08-11T15:06:13Z",
                      "shipmentLabel": "s:8 S009",
                  },
                  {
                      "shipmentIndex": 3,
                      "startTime": "2023-08-11T15:10:39Z",
                      "shipmentLabel": "p:2 S004",
                  },
                  {
                      "shipmentIndex": 1,
                      "startTime": "2023-08-11T15:22:43Z",
                      "shipmentLabel": "p:0 S001,S002",
                  },
                  {
                      "shipmentIndex": 2,
                      "startTime": "2023-08-11T15:38:15Z",
                      "shipmentLabel": "p:1 S003",
                  },
                  {
                      "shipmentIndex": 5,
                      "startTime": "2023-08-11T15:50:19Z",
                      "shipmentLabel": "p:4 S007",
                  },
              ],
              "transitions": [
                  {
                      "totalDuration": "25573s",
                      "startTime": "2023-08-11T08:00:00Z",
                  },
                  {
                      "totalDuration": "116s",
                      "startTime": "2023-08-11T15:08:43Z",
                  },
                  {
                      "totalDuration": "0s",
                      "startTime": "2023-08-11T15:22:43Z",
                  },
                  {
                      "totalDuration": "0s",
                      "startTime": "2023-08-11T15:38:15Z",
                  },
                  {
                      "totalDuration": "0s",
                      "startTime": "2023-08-11T15:50:19Z",
                  },
                  {
                      "totalDuration": "162s",
                      "startTime": "2023-08-11T15:57:18Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "28800s",
              },
              "routeTotalCost": 481.985,
          },
          {
              "vehicleIndex": 1,
              "vehicleLabel": "V002",
              "vehicleStartTime": "2023-08-11T08:00:00Z",
              "vehicleEndTime": "2023-08-11T20:00:00Z",
              "visits": [
                  {
                      "shipmentIndex": 6,
                      "startTime": "2023-08-11T19:40:49Z",
                      "shipmentLabel": "p:5 S008",
                  },
                  {
                      "shipmentIndex": 4,
                      "startTime": "2023-08-11T19:47:48Z",
                      "shipmentLabel": "p:3 S006,S005",
                  },
              ],
              "transitions": [
                  {
                      "totalDuration": "42049s",
                      "startTime": "2023-08-11T08:00:00Z",
                  },
                  {
                      "totalDuration": "0s",
                      "startTime": "2023-08-11T19:47:48Z",
                  },
                  {
                      "totalDuration": "162s",
                      "startTime": "2023-08-11T19:57:18Z",
                  },
              ],
              "metrics": {
                  "totalDuration": "43200s",
              },
              "routeTotalCost": 721.965,
          },
      ],
      "totalCost": 1203.95,
  }

  # The expected merged model request created by the two-step planner for the
  # base request defined above, using _EXPECTED_LOCAL_REQUEST and
  # _EXPECTED_GLOBAL_REQUEST as the solutions of the local and global models.
  _EXPECTED_MERGED_REQUEST_JSON = {
      "label": "my_little_model/merged",
      "model": {
          "globalEndTime": "2023-08-12T00:00:00.000Z",
          "globalStartTime": "2023-08-11T00:00:00.000Z",
          "shipments": [
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86471,
                                  "longitude": 2.34901,
                              }
                          }
                      },
                      "duration": "120s",
                  }],
                  "label": "S001",
                  "costsPerVehicle": [100, 200],
                  "costsPerVehicleIndices": [0, 1],
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86593,
                                  "longitude": 2.34886,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "S002",
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86594,
                                  "longitude": 2.34887,
                              }
                          }
                      },
                      "duration": "60s",
                      "timeWindows": [
                          {"startTime": "2023-08-11T12:00:00.000Z"}
                      ],
                  }],
                  "label": "S003",
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86595,
                                  "longitude": 2.34888,
                              }
                          }
                      },
                      "duration": "60s",
                      "timeWindows": [{
                          "endTime": "2023-08-11T16:00:00.000Z",
                          "startTime": "2023-08-11T14:00:00.000Z",
                      }],
                  }],
                  "label": "S004",
              },
              {
                  "allowedVehicleIndices": [0, 1],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86596,
                                  "longitude": 2.34889,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "S005",
              },
              {
                  "allowedVehicleIndices": [0, 1],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "S006",
                  "loadDemands": {
                      "ore": {"amount": "2"},
                      "wheat": {"amount": "3"},
                  },
              },
              {
                  "allowedVehicleIndices": [0],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "S007",
                  "loadDemands": {
                      "ore": {"amount": "1"},
                      "wood": {"amount": "5"},
                  },
              },
              {
                  "allowedVehicleIndices": [1],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "S008",
              },
              {
                  "allowedVehicleIndices": [0, 1],
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86597,
                                  "longitude": 2.3489,
                              }
                          }
                      },
                      "duration": "150s",
                  }],
                  "label": "S009",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P001 arrival",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P001 departure",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P001 arrival",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P001 departure",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P001 arrival",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P001 departure",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P002 arrival",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P002 departure",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P002 arrival",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P002 departure",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P002 arrival",
              },
              {
                  "deliveries": [{
                      "arrivalWaypoint": {
                          "location": {
                              "latLng": {
                                  "latitude": 48.86482,
                                  "longitude": 2.34932,
                              }
                          }
                      },
                      "duration": "0s",
                  }],
                  "label": "P002 departure",
              },
          ],
          "vehicles": [
              {
                  "costPerHour": 60,
                  "costPerKilometer": 1,
                  "endTimeWindows": [{
                      "endTime": "2023-08-11T21:00:00.000Z",
                      "startTime": "2023-08-11T16:00:00.000Z",
                  }],
                  "endWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "label": "V001",
                  "startTimeWindows": [{
                      "endTime": "2023-08-11T08:00:00.000Z",
                      "startTime": "2023-08-11T08:00:00.000Z",
                  }],
                  "startWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "travelDurationMultiple": 1,
                  "travelMode": 1,
              },
              {
                  "costPerHour": 60,
                  "costPerKilometer": 1,
                  "endTimeWindows": [{
                      "endTime": "2023-08-11T21:00:00.000Z",
                      "startTime": "2023-08-11T20:00:00.000Z",
                  }],
                  "endWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "label": "V002",
                  "startTimeWindows": [{
                      "endTime": "2023-08-11T08:00:00.000Z",
                      "startTime": "2023-08-11T08:00:00.000Z",
                  }],
                  "startWaypoint": {
                      "location": {
                          "latLng": {"latitude": 48.86321, "longitude": 2.34767}
                      }
                  },
                  "travelDurationMultiple": 1,
                  "travelMode": 1,
              },
          ],
      },
      "parent": "my_awesome_project",
  }

  # The expected merged model response creatd by the two-step planner for the
  # base request defined above, using _EXPECTED_LOCAL_REQUEST and
  # _EXPECTED_GLOBAL_REQUEST as the solutions of the local and global models.
  _EXPECTED_MERGED_RESPONSE_JSON = {
      "routes": [
          {
              "routeTotalCost": 481.985,
              "transitions": [
                  {
                      "startTime": "2023-08-11T08:00:00Z",
                      "totalDuration": "25573s",
                  },
                  {
                      "startTime": "2023-08-11T15:08:43Z",
                      "totalDuration": "116s",
                  },
                  {
                      "startTime": "2023-08-11T15:10:39Z",
                      "totalDuration": "536s",
                  },
                  {
                      "startTime": "2023-08-11T15:20:35Z",
                      "totalDuration": "128s",
                  },
                  {"startTime": "2023-08-11T15:22:43Z", "totalDuration": "0s"},
                  {
                      "startTime": "2023-08-11T15:22:43Z",
                      "totalDuration": "157s",
                  },
                  {
                      "startTime": "2023-08-11T15:27:20Z",
                      "totalDuration": "377s",
                  },
                  {
                      "startTime": "2023-08-11T15:36:07Z",
                      "totalDuration": "128s",
                  },
                  {"startTime": "2023-08-11T15:38:15Z", "totalDuration": "0s"},
                  {
                      "startTime": "2023-08-11T15:38:15Z",
                      "totalDuration": "536s",
                  },
                  {
                      "startTime": "2023-08-11T15:48:11Z",
                      "totalDuration": "128s",
                  },
                  {"startTime": "2023-08-11T15:50:19Z", "totalDuration": "0s"},
                  {
                      "startTime": "2023-08-11T15:50:19Z",
                      "totalDuration": "135s",
                  },
                  {
                      "startTime": "2023-08-11T15:55:04Z",
                      "totalDuration": "134s",
                  },
                  {
                      "startTime": "2023-08-11T15:57:18Z",
                      "totalDuration": "162s",
                  },
              ],
              "vehicleEndTime": "2023-08-11T16:00:00Z",
              "vehicleIndex": 0,
              "vehicleLabel": "V001",
              "vehicleStartTime": "2023-08-11T08:00:00Z",
              "visits": [
                  {
                      "shipmentIndex": 8,
                      "shipmentLabel": "S009",
                      "startTime": "2023-08-11T15:06:13Z",
                  },
                  {
                      "shipmentIndex": 9,
                      "shipmentLabel": "P001 arrival",
                      "startTime": "2023-08-11T15:10:39Z",
                  },
                  {
                      "shipmentIndex": 3,
                      "shipmentLabel": "S004",
                      "startTime": "2023-08-11T15:19:35Z",
                  },
                  {
                      "shipmentIndex": 10,
                      "shipmentLabel": "P001 departure",
                      "startTime": "2023-08-11T15:22:43Z",
                  },
                  {
                      "shipmentIndex": 11,
                      "shipmentLabel": "P001 arrival",
                      "startTime": "2023-08-11T15:22:43Z",
                  },
                  {
                      "shipmentIndex": 0,
                      "shipmentLabel": "S001",
                      "startTime": "2023-08-11T15:25:20Z",
                  },
                  {
                      "shipmentIndex": 1,
                      "shipmentLabel": "S002",
                      "startTime": "2023-08-11T15:33:37Z",
                  },
                  {
                      "shipmentIndex": 12,
                      "shipmentLabel": "P001 departure",
                      "startTime": "2023-08-11T15:38:15Z",
                  },
                  {
                      "shipmentIndex": 13,
                      "shipmentLabel": "P001 arrival",
                      "startTime": "2023-08-11T15:38:15Z",
                  },
                  {
                      "shipmentIndex": 2,
                      "shipmentLabel": "S003",
                      "startTime": "2023-08-11T15:47:11Z",
                  },
                  {
                      "shipmentIndex": 14,
                      "shipmentLabel": "P001 departure",
                      "startTime": "2023-08-11T15:50:19Z",
                  },
                  {
                      "shipmentIndex": 15,
                      "shipmentLabel": "P002 arrival",
                      "startTime": "2023-08-11T15:50:19Z",
                  },
                  {
                      "shipmentIndex": 6,
                      "shipmentLabel": "S007",
                      "startTime": "2023-08-11T15:52:34Z",
                  },
                  {
                      "shipmentIndex": 16,
                      "shipmentLabel": "P002 departure",
                      "startTime": "2023-08-11T15:57:18Z",
                  },
              ],
          },
          {
              "routeTotalCost": 721.965,
              "transitions": [
                  {
                      "startTime": "2023-08-11T08:00:00Z",
                      "totalDuration": "42049s",
                  },
                  {
                      "startTime": "2023-08-11T19:40:49Z",
                      "totalDuration": "135s",
                  },
                  {
                      "startTime": "2023-08-11T19:45:34Z",
                      "totalDuration": "134s",
                  },
                  {"startTime": "2023-08-11T19:47:48Z", "totalDuration": "0s"},
                  {
                      "startTime": "2023-08-11T19:47:48Z",
                      "totalDuration": "135s",
                  },
                  {"startTime": "2023-08-11T19:52:33Z", "totalDuration": "0s"},
                  {
                      "startTime": "2023-08-11T19:55:03Z",
                      "totalDuration": "135s",
                  },
                  {
                      "startTime": "2023-08-11T19:57:18Z",
                      "totalDuration": "162s",
                  },
              ],
              "vehicleEndTime": "2023-08-11T20:00:00Z",
              "vehicleIndex": 1,
              "vehicleLabel": "V002",
              "vehicleStartTime": "2023-08-11T08:00:00Z",
              "visits": [
                  {
                      "shipmentIndex": 17,
                      "shipmentLabel": "P002 arrival",
                      "startTime": "2023-08-11T19:40:49Z",
                  },
                  {
                      "shipmentIndex": 7,
                      "shipmentLabel": "S008",
                      "startTime": "2023-08-11T19:43:04Z",
                  },
                  {
                      "shipmentIndex": 18,
                      "shipmentLabel": "P002 departure",
                      "startTime": "2023-08-11T19:47:48Z",
                  },
                  {
                      "shipmentIndex": 19,
                      "shipmentLabel": "P002 arrival",
                      "startTime": "2023-08-11T19:47:48Z",
                  },
                  {
                      "shipmentIndex": 5,
                      "shipmentLabel": "S006",
                      "startTime": "2023-08-11T19:50:03Z",
                  },
                  {
                      "shipmentIndex": 4,
                      "shipmentLabel": "S005",
                      "startTime": "2023-08-11T19:52:33Z",
                  },
                  {
                      "shipmentIndex": 20,
                      "shipmentLabel": "P002 departure",
                      "startTime": "2023-08-11T19:57:18Z",
                  },
              ],
          },
      ]
  }

  def validate_response(
      self,
      request: two_step_routing.OptimizeToursRequest,
      response: two_step_routing.OptimizeToursResponse,
  ):
    """Validates basic properties of the merged response."""
    vehicles = request["model"]["vehicles"]
    shipments = request["model"]["shipments"]
    num_vehicles = len(vehicles)
    num_shipments = len(shipments)
    routes = response["routes"]
    self.assertEqual(num_vehicles, len(routes))

    picked_up_shipments = set()
    delivered_shipments = set()

    for vehicle_index in range(num_vehicles):
      with self.subTest(vehicle_index=vehicle_index):
        route = routes[vehicle_index]
        vehicle = vehicles[vehicle_index]
        self.assertEqual(route["vehicleLabel"], vehicle["label"])
        self.assertEqual(route.get("vehicleIndex", 0), vehicle_index)

        if "visits" not in route:
          self.assertNotIn("transitions", route)
          continue

        visits = route["visits"]
        transitions = route["transitions"]
        self.assertEqual(len(visits) + 1, len(transitions))

        total_duration = datetime.timedelta()
        current_time = two_step_routing._parse_time_string(
            route["vehicleStartTime"]
        )
        for visit_index, visit in enumerate(visits):
          with self.subTest(visit_index=visit_index):
            shipment_index = visit.get("shipmentIndex", 0)
            # Make sure that each shipment is delivered at most once, and that
            # if a shipment has a pickup and a delivery, it is picked up before
            # it is delivered.
            self.assertNotIn(shipment_index, delivered_shipments)

            is_pickup = visit.get("isPickup", False)
            if is_pickup:
              self.assertNotIn(
                  shipment_index,
                  picked_up_shipments,
                  "Shipment was already picked up",
              )
              picked_up_shipments.add(shipment_index)
            else:
              delivered_shipments.add(shipment_index)

            shipment = shipments[shipment_index]
            transition = transitions[visit_index]
            self.assertEqual(
                current_time,
                two_step_routing._parse_time_string(transition["startTime"]),
            )
            transition_duration = two_step_routing._parse_duration_string(
                transition["totalDuration"]
            )
            visit_duration = two_step_routing._parse_duration_string(
                shipment["deliveries"][0]["duration"]
            )
            total_duration += transition_duration
            current_time += transition_duration
            self.assertEqual(
                current_time,
                two_step_routing._parse_time_string(visit["startTime"]),
            )
            total_duration += visit_duration
            current_time += visit_duration
        total_duration += two_step_routing._parse_duration_string(
            transitions[-1]["totalDuration"]
        )
        self.assertEqual(
            total_duration,
            two_step_routing._parse_time_string(route["vehicleEndTime"])
            - two_step_routing._parse_time_string(route["vehicleStartTime"]),
        )

    # Collect skipped shipment indices.
    skipped_shipments = set()
    for skipped_shipment in response.get("skippedShipments", ()):
      skipped_shipments.add(skipped_shipment["index"])

    # A skipped shipment should not be picked up or delivered.
    self.assertEqual(set(), skipped_shipments.intersection(picked_up_shipments))
    self.assertEqual(set(), skipped_shipments.intersection(delivered_shipments))

    # Check that each shipment is picked up, delivered, or skipped.
    picked_up_delivered_and_skipped_shipments = delivered_shipments.union(
        picked_up_shipments, skipped_shipments
    )
    self.assertCountEqual(
        tuple(range(num_shipments)), picked_up_delivered_and_skipped_shipments
    )

  def test_validate_request(self):
    self.assertIsNone(
        two_step_routing.validate_request(
            self._REQUEST_JSON, self._PARKING_FOR_SHIPMENT
        )
    )

  def test_local_request_and_response(self):
    self.validate_response(
        self._EXPECTED_LOCAL_REQUEST_JSON, self._LOCAL_RESPONSE_JSON
    )

  def test_global_request_and_response(self):
    self.validate_response(
        self._EXPECTED_GLOBAL_REQUEST_JSON, self._GLOBAL_RESPONSE_JSON
    )

  def test_merged_request_and_response(self):
    self.validate_response(
        self._EXPECTED_MERGED_REQUEST_JSON, self._EXPECTED_MERGED_RESPONSE_JSON
    )


class PlannerTestLocalModel(PlannerTest):
  """Tests for Planner.make_local_request()."""

  def test_make_local_model_time_windows(self):
    planner = two_step_routing.Planner(
        request_json=self._REQUEST_JSON,
        parking_locations=self._PARKING_LOCATIONS,
        parking_for_shipment=self._PARKING_FOR_SHIPMENT,
        options=self._OPTIONS,
    )
    self.assertCountEqual(planner._direct_shipments, [8])
    self.assertEqual(
        planner.make_local_request(),
        self._EXPECTED_LOCAL_REQUEST_JSON,
    )


class PlannerTestGlobalModel(PlannerTest):
  """Tests for Planner.make_global_request()."""

  def test_make_global_request(self):
    planner = two_step_routing.Planner(
        request_json=self._REQUEST_JSON,
        parking_locations=self._PARKING_LOCATIONS,
        parking_for_shipment=self._PARKING_FOR_SHIPMENT,
        options=self._OPTIONS,
    )
    global_request = planner.make_global_request(self._LOCAL_RESPONSE_JSON)
    self.assertEqual(global_request, self._EXPECTED_GLOBAL_REQUEST_JSON)


class PlannerTestMergedModel(PlannerTest):
  """Tests for Planner.merge_local_and_global_result()."""

  def test_make_merged_request_and_response(self):
    planner = two_step_routing.Planner(
        request_json=self._REQUEST_JSON,
        parking_locations=self._PARKING_LOCATIONS,
        parking_for_shipment=self._PARKING_FOR_SHIPMENT,
        options=self._OPTIONS,
    )
    merged_request, merged_response = planner.merge_local_and_global_result(
        self._LOCAL_RESPONSE_JSON,
        self._GLOBAL_RESPONSE_JSON,
    )
    self.assertEqual(merged_request, self._EXPECTED_MERGED_REQUEST_JSON)
    self.assertEqual(merged_response, self._EXPECTED_MERGED_RESPONSE_JSON)


class ParseGlobalShipmentLabelTest(unittest.TestCase):
  """Tests for _parse_global_shipment_label."""

  def test_empty_label(self):
    with self.assertRaises(ValueError):
      two_step_routing._parse_global_shipment_label("")

  def test_invalid_label(self):
    with self.assertRaises(ValueError):
      two_step_routing._parse_global_shipment_label("foobar")

  def test_shipment_label(self):
    visit_type, index = two_step_routing._parse_global_shipment_label(
        "s:1 S003"
    )
    self.assertEqual(visit_type, "s")
    self.assertEqual(index, 1)

  def test_parking_label(self):
    visit_type, index = two_step_routing._parse_global_shipment_label(
        "p:3 S003,S004,S007"
    )
    self.assertEqual(visit_type, "p")
    self.assertEqual(index, 3)


class CombinedCostsPerVehicleTest(unittest.TestCase):
  """Tests for _combined_costs_per_vehicle."""

  def test_no_shipments(self):
    self.assertIsNone(two_step_routing._combined_costs_per_vehicle([]))

  def test_no_costs_per_vehicle(self):
    self.assertIsNone(
        two_step_routing._combined_costs_per_vehicle([{}, {}, {}])
    )

  def test_some_costs(self):
    shipments = [
        {
            "costsPerVehicle": [1000, 2000, 3000],
            "costsPerVehicleIndices": [0, 2, 5],
        },
        {
            "costsPerVehicle": [10, 20, 30, 40],
            "costsPerVehicleIndices": [1, 3, 5, 6],
        },
        {},
        {
            "costsPerVehicle": [2, 3],
            "costsPerVehicleIndices": [5, 6],
        },
    ]
    expected_costs = [1000, 10, 2000, 20, 3000, 40]
    expected_vehicle_indices = [0, 1, 2, 3, 5, 6]
    self.assertEqual(
        two_step_routing._combined_costs_per_vehicle(shipments),
        (expected_vehicle_indices, expected_costs),
    )


class CombinedPenaltyCostTest(unittest.TestCase):
  """Tests for _combined_penalty_cost."""

  def test_no_shipments(self):
    self.assertEqual(two_step_routing._combined_penalty_cost(()), 0)

  def test_no_mandatory_shipments(self):
    shipments = [
        {"penaltyCost": 100},
        {"penaltyCost": 1_000},
        {"penaltyCost": 10_000},
    ]
    self.assertEqual(two_step_routing._combined_penalty_cost(shipments), 11100)

  def test_some_mandatory_shipments(self):
    shipments = [{"penaltyCost": 100}, {}, {"penaltyCost": 10000}]
    self.assertIsNone(two_step_routing._combined_penalty_cost(shipments))

  def test_all_mandatory_shipments(self):
    shipments = [{}, {}, {}]
    self.assertIsNone(two_step_routing._combined_penalty_cost(shipments))


class CombinedLoadDemandsTest(unittest.TestCase):
  """Tests for _combined_load_demands."""

  def test_no_shipments(self):
    self.assertEqual(two_step_routing._combined_load_demands(()), {})

  def test_some_shipments(self):
    shipments = [
        _make_shipment(
            "S001",
            latlng=(48.86471, 2.34901),
            duration="120s",
            load_demands={"wheat": 3, "wood": 1},
        ),
        _make_shipment(
            "S002",
            latlng=(48.86471, 2.34901),
            duration="120s",
            load_demands={"wood": 5, "ore": 2},
        ),
        _make_shipment(
            "S002",
            latlng=(48.86471, 2.34901),
            duration="120s",
        ),
    ]
    self.assertEqual(
        two_step_routing._combined_load_demands(shipments),
        {
            "wheat": {"amount": "3"},
            "wood": {"amount": "6"},
            "ore": {"amount": "2"},
        },
    )


class GetParkingTagFromLocalRouteTest(unittest.TestCase):
  """Tests for _get_parking_tag_from_local_route."""

  def test_empty_string(self):
    with self.assertRaises(ValueError):
      two_step_routing._get_parking_tag_from_local_route({"vehicleLabel": ""})

  def test_no_timestamp(self):
    self.assertEqual(
        two_step_routing._get_parking_tag_from_local_route(
            {"vehicleLabel": "P002 []/1"}
        ),
        "P002",
    )

  def test_with_timestamp(self):
    self.assertEqual(
        two_step_routing._get_parking_tag_from_local_route(
            {
                "vehicleLabel": (
                    "P001 [start=2023-08-11T14:00:00.000Z"
                    " end=2023-08-11T16:00:00.000Z]/0"
                )
            },
        ),
        "P001",
    )


class MakeLocalModelVehicleLabelTest(unittest.TestCase):
  """Tests for _make_local_delivery_model_vehicle_label."""

  maxDiff = None

  def test_parking_tag_only(self):
    self.assertEqual(
        two_step_routing._make_local_model_vehicle_label(
            two_step_routing._ParkingGroupKey("P123")
        ),
        "P123 []",
    )

  def test_parking_tag_and_start_time(self):
    self.assertEqual(
        two_step_routing._make_local_model_vehicle_label(
            two_step_routing._ParkingGroupKey(
                "P123", "2023-08-11T00:00:00.000Z"
            )
        ),
        "P123 [start=2023-08-11T00:00:00.000Z]",
    )

  def test_parking_tag_and_end_time(self):
    self.assertEqual(
        two_step_routing._make_local_model_vehicle_label(
            two_step_routing._ParkingGroupKey(
                "P123", None, "2023-08-11T00:00:00.000Z"
            )
        ),
        "P123 [end=2023-08-11T00:00:00.000Z]",
    )

  def test_parking_tag_and_start_and_end_time(self):
    self.assertEqual(
        two_step_routing._make_local_model_vehicle_label(
            two_step_routing._ParkingGroupKey(
                "P123", "2023-08-11T00:00:00.000Z", "2023-08-11T08:00:00.000Z"
            )
        ),
        "P123 [start=2023-08-11T00:00:00.000Z end=2023-08-11T08:00:00.000Z]",
    )

  def test_parking_tag_and_allowed_vehicles(self):
    self.assertEqual(
        two_step_routing._make_local_model_vehicle_label(
            two_step_routing._ParkingGroupKey("P123", None, None, (0, 1, 2))
        ),
        "P123 [vehicles=(0, 1, 2)]",
    )

  def test_parking_tag_times_and_allowed_vehicles(self):
    self.assertEqual(
        two_step_routing._make_local_model_vehicle_label(
            two_step_routing._ParkingGroupKey(
                "P123",
                "2023-08-11T00:00:00.000Z",
                "2023-08-11T08:00:00.000Z",
                (0, 1, 2),
            )
        ),
        "P123 [start=2023-08-11T00:00:00.000Z end=2023-08-11T08:00:00.000Z"
        " vehicles=(0, 1, 2)]",
    )


class ParkingDeliveryGroupTest(unittest.TestCase):
  """Tests for _parking_delivery_group_key."""

  maxDiff = None

  _START_TIME = "2023-08-09T12:12:00.000Z"
  _END_TIME = "2023-08-09T12:45:32.000Z"
  _SHIPMENT_NO_TIME_WINDOW: two_step_routing.Shipment = {
      "deliveries": [{
          "arrivalWaypoint": {
              "location": {
                  "latLng": {"latitude": 35.7669, "longitude": 139.7286}
              }
          },
      }],
      "label": "2023081000001",
  }
  _SHIPMENT_TIME_WINDOW_START: two_step_routing.Shipment = {
      "deliveries": [{
          "arrivalWaypoint": {
              "location": {
                  "latLng": {"latitude": 35.7669, "longitude": 139.7286}
              }
          },
          "timeWindows": [{"startTime": _START_TIME}],
      }],
  }
  _SHIPMENT_TIME_WINDOW_END: two_step_routing.Shipment = {
      "deliveries": [{
          "arrivalWaypoint": {
              "location": {
                  "latLng": {"latitude": 35.7669, "longitude": 139.7286}
              }
          },
          "timeWindows": [{"endTime": _END_TIME}],
      }],
  }
  _SHIPMENT_TIME_WINDOW_START_END: two_step_routing.Shipment = {
      "deliveries": [{
          "arrivalWaypoint": {
              "location": {
                  "latLng": {"latitude": 35.7669, "longitude": 139.7286}
              }
          },
          "timeWindows": [{
              "startTime": _START_TIME,
              "endTime": _END_TIME,
          }],
      }],
  }
  _SHIPMENT_ALLOWED_VEHICLES: two_step_routing.Shipment = {
      "deliveries": [{
          "arrivalWaypoint": {
              "location": {
                  "latLng": {"latitude": 35.7669, "longitude": 139.7286}
              }
          },
      }],
      "label": "2023081000001",
      "allowedVehicleIndices": [0, 5, 2],
  }

  _PARKING_LOCATION = two_step_routing.ParkingLocation(
      coordinates={"latitude": 35.7668, "longitude": 139.7285}, tag="P1234"
  )

  def test_with_no_parking(self):
    for shipment in (
        self._SHIPMENT_NO_TIME_WINDOW,
        self._SHIPMENT_TIME_WINDOW_START,
        self._SHIPMENT_TIME_WINDOW_END,
        self._SHIPMENT_TIME_WINDOW_START_END,
        self._SHIPMENT_ALLOWED_VEHICLES,
    ):
      self.assertEqual(
          two_step_routing._parking_delivery_group_key(shipment, None),
          two_step_routing._ParkingGroupKey(),
      )

  def test_with_parking_and_no_time_window(self):
    self.assertEqual(
        two_step_routing._parking_delivery_group_key(
            self._SHIPMENT_NO_TIME_WINDOW, self._PARKING_LOCATION
        ),
        two_step_routing._ParkingGroupKey("P1234"),
    )

  def test_with_parking_and_time_window_start(self):
    self.assertEqual(
        two_step_routing._parking_delivery_group_key(
            self._SHIPMENT_TIME_WINDOW_START, self._PARKING_LOCATION
        ),
        two_step_routing._ParkingGroupKey("P1234", self._START_TIME, None),
    )

  def test_with_parking_and_time_window_end(self):
    self.assertEqual(
        two_step_routing._parking_delivery_group_key(
            self._SHIPMENT_TIME_WINDOW_END, self._PARKING_LOCATION
        ),
        two_step_routing._ParkingGroupKey("P1234", None, self._END_TIME),
    )

  def test_with_parking_and_time_window_start_end(self):
    self.assertEqual(
        two_step_routing._parking_delivery_group_key(
            self._SHIPMENT_TIME_WINDOW_START_END, self._PARKING_LOCATION
        ),
        two_step_routing._ParkingGroupKey(
            "P1234", self._START_TIME, self._END_TIME
        ),
    )

  def test_with_allowed_vehicles(self):
    self.assertEqual(
        two_step_routing._parking_delivery_group_key(
            self._SHIPMENT_ALLOWED_VEHICLES, self._PARKING_LOCATION
        ),
        two_step_routing._ParkingGroupKey(
            "P1234",
            None,
            None,
            (0, 2, 5),
        ),
    )


class ParseTimeStringTest(unittest.TestCase):
  """Tests for _parse_time_string."""

  maxDiff = None

  def test_empty_string(self):
    with self.assertRaises(ValueError):
      two_step_routing._parse_time_string("")

  def test_date_only(self):
    self.assertEqual(
        two_step_routing._parse_time_string("2023-08-11"),
        datetime.datetime(year=2023, month=8, day=11),
    )

  def test_fractional_seconds(self):
    self.assertEqual(
        two_step_routing._parse_time_string("2023-08-15T12:32:44.567Z"),
        datetime.datetime(
            year=2023,
            month=8,
            day=15,
            hour=12,
            minute=32,
            second=44,
            microsecond=567000,
        ),
    )


class MakeTimeStringTest(unittest.TestCase):
  """Tests for _make_time_string."""

  maxDiff = None

  def test_no_timezone(self):
    self.assertEqual(
        two_step_routing._make_time_string(
            datetime.datetime(
                year=2023,
                month=8,
                day=15,
                hour=9,
                minute=21,
                second=32,
            )
        ),
        "2023-08-15T09:21:32Z",
    )

  def test_with_timezone(self):
    self.assertEqual(
        two_step_routing._make_time_string(
            datetime.datetime(
                year=2023,
                month=8,
                day=15,
                hour=9,
                minute=21,
                second=32,
                tzinfo=datetime.timezone(datetime.timedelta(hours=+2)),
            )
        ),
        "2023-08-15T09:21:32+02:00",
    )


class UpdateTimeStringTest(unittest.TestCase):
  """Tests fo _update_time_string."""

  def test_invalid_time(self):
    with self.assertRaises(ValueError):
      two_step_routing._update_time_string(
          "foobar", datetime.timedelta(seconds=12)
      )

  def test_update_some_time(self):
    self.assertEqual(
        two_step_routing._update_time_string(
            "2023-08-15T12:32:44Z", datetime.timedelta(hours=-3)
        ),
        "2023-08-15T09:32:44Z",
    )


class ParseDurationStringTest(unittest.TestCase):
  """Tests for _parse_duration_string."""

  def test_empty_string(self):
    with self.assertRaises(ValueError):
      two_step_routing._parse_duration_string("")

  def test_invalid_format(self):
    with self.assertRaises(ValueError):
      two_step_routing._parse_duration_string("foobar")

  def test_invalid_suffix(self):
    with self.assertRaises(ValueError):
      two_step_routing._parse_duration_string("2h")

  def test_invalid_amount(self):
    with self.assertRaises(ValueError):
      two_step_routing._parse_duration_string("ABCs")

  def test_valid_parse(self):
    self.assertEqual(
        two_step_routing._parse_duration_string("0s"),
        datetime.timedelta(seconds=0),
    )
    self.assertEqual(
        two_step_routing._parse_duration_string("1800s"),
        datetime.timedelta(minutes=30),
    )
    self.assertEqual(
        two_step_routing._parse_duration_string("0.5s"),
        datetime.timedelta(seconds=0.5),
    )


if __name__ == "__main__":
  unittest.main()
