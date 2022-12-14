/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Injectable } from '@angular/core';

import { merge } from 'lodash';

import {
  IDuration,
  IInjectedSolution,
  ILoad,
  ILoadLimit,
  IShipment,
  IShipmentRoute,
  ISkippedShipmentReason,
  NormalizedShipmentModel,
  Scenario,
  ScenarioSearchMode,
  ScenarioSolvingMode,
  SearchMode,
  Shipment,
  ShipmentRoute,
  Solution,
  Vehicle,
  VisitRequest,
  Visit,
  IBreakRule,
  IShipmentModel,
  VehicleOperator,
} from 'src/app/core/models';
import { durationSeconds } from 'src/app/util';

@Injectable({
  providedIn: 'root',
})
export class NormalizationService {
  /**
   * Normalizes a scenario
   */
  normalizeScenario(
    scenario: Scenario,
    changeTime: number
  ): {
    firstSolutionRoutes: IShipmentRoute[];
    injectedModelConstraint: IInjectedSolution;
    injectedSolution: boolean;
    label: string;
    searchMode: ScenarioSearchMode;
    shipments: Shipment[];
    shipmentModel: NormalizedShipmentModel;
    solvingMode: ScenarioSolvingMode;
    timeout: IDuration;
    traffic: boolean;
    visitRequests: VisitRequest[];
    vehicles: Vehicle[];
    vehicleOperators: VehicleOperator[];
    allowLargeDeadlineDespiteInterruptionRisk: boolean;
    interpretInjectedSolutionsUsingLabels: boolean;
    populateTransitionPolylines: boolean;
    useGeodesicDistances: boolean;
    geodesicMetersPerSecond: number;
    normalizedScenario: Scenario;
  } {
    const { shipments, visitRequests } = this.normalizeShipments(
      scenario?.model?.shipments || [],
      changeTime
    );

    const { breakRules, ...scenarioModel } = { breakRules: [], ...scenario.model };
    const { vehicles } = this.normalizeVehicles(scenarioModel, breakRules, changeTime);
    const { vehicleOperators } = this.normalizeVehicleOperators(scenarioModel, changeTime);
    const normalizedScenario = { ...scenario, model: scenarioModel };
    const firstSolutionRoutes = normalizedScenario?.injectedFirstSolutionRoutes;

    const { globalStartTime, globalEndTime } = this.normalizeGlobalStartEnd(normalizedScenario);
    const shipmentModel = <NormalizedShipmentModel>{
      globalDurationCostPerHour: normalizedScenario?.model?.globalDurationCostPerHour,
      maxActiveVehicles: normalizedScenario?.model?.maxActiveVehicles,
      globalStartTime,
      globalEndTime,
      precedenceRules: scenario?.model?.precedenceRules,
      shipmentTypeIncompatibilities: scenario?.model?.shipmentTypeIncompatibilities,
      shipmentTypeRequirements: scenario?.model?.shipmentTypeRequirements,
      transitionAttributes: scenario?.model?.transitionAttributes,
    };

    const injectedSolution = normalizedScenario?.injectedSolutionConstraint != null;
    const injectedModelConstraint = this.normalizeInjectedSolution(
      normalizedScenario?.injectedSolutionConstraint,
      vehicles
    );
    const label = normalizedScenario?.label || '';

    const solvingMode = normalizedScenario?.solvingMode;
    const traffic = normalizedScenario?.considerRoadTraffic || false;
    const searchMode = normalizedScenario?.searchMode || SearchMode.RETURN_FAST;
    const timeout = normalizedScenario?.timeout;
    const interpretInjectedSolutionsUsingLabels =
      normalizedScenario?.interpretInjectedSolutionsUsingLabels;
    const populateTransitionPolylines = normalizedScenario?.populateTransitionPolylines;
    const allowLargeDeadlineDespiteInterruptionRisk =
      normalizedScenario?.allowLargeDeadlineDespiteInterruptionRisk;
    const useGeodesicDistances = normalizedScenario?.useGeodesicDistances;
    const geodesicMetersPerSecond = normalizedScenario?.geodesicMetersPerSecond;

    return {
      firstSolutionRoutes,
      injectedModelConstraint,
      injectedSolution,
      label,
      searchMode,
      shipments,
      shipmentModel,
      solvingMode,
      timeout,
      traffic,
      visitRequests,
      vehicles,
      vehicleOperators,
      allowLargeDeadlineDespiteInterruptionRisk,
      interpretInjectedSolutionsUsingLabels,
      populateTransitionPolylines,
      useGeodesicDistances,
      geodesicMetersPerSecond,
      normalizedScenario,
    };
  }

  normalizeInjectedSolution(
    injectedSolution: IInjectedSolution,
    vehicles: Vehicle[]
  ): IInjectedSolution {
    if (!injectedSolution) {
      return injectedSolution;
    }

    const normalizedInjectSolution = {
      ...injectedSolution,
      constraintRelaxations: injectedSolution.constraintRelaxations?.map(
        (constraintRelaxation) => ({
          ...constraintRelaxation,
          vehicleIndices:
            constraintRelaxation.vehicleIndices?.map((index) => vehicles[index].id) || [],
        })
      ),
    };
    return normalizedInjectSolution;
  }

  normalizeGlobalStartEnd(scenario: Scenario): { globalStartTime: number; globalEndTime: number } {
    // If scenario time is not provided, default to the current time
    const now = new Date();
    now.setSeconds(0, 0);
    const nowSeconds = now.getTime() / 1000;
    const tomorrowSeconds = nowSeconds + 86400;
    const model = scenario?.model;
    const globalStartTime = model?.globalStartTime
      ? durationSeconds(model.globalStartTime).toNumber()
      : nowSeconds;
    const globalEndTime = model?.globalEndTime
      ? durationSeconds(model.globalEndTime).toNumber()
      : tomorrowSeconds;
    return { globalStartTime, globalEndTime };
  }

  /**
   * Normalizes a solution
   */
  normalizeSolution(
    solution: Solution,
    vehicleIds: number[],
    shipments: Shipment[],
    changeTime: number
  ): {
    shipmentRoutes: ShipmentRoute[];
    visits: Visit[];
    skippedShipments: number[];
    skippedShipmentReasons: { [id: number]: ISkippedShipmentReason[] };
  } {
    return {
      ...this.normalizeShipmentRoutes(solution?.routes || [], vehicleIds, shipments, changeTime),
      skippedShipments:
        solution?.skippedShipments?.map((shipment) => shipments[shipment.index || 0].id) || [],
      skippedShipmentReasons: this.getSkippedShipmentReasons(shipments, solution),
    };
  }

  private getSkippedShipmentReasons(
    shipments: Shipment[],
    solution: Solution
  ): { [id: number]: ISkippedShipmentReason[] } {
    const skippedShipmentReasons: { [id: number]: ISkippedShipmentReason[] } = {};
    solution?.skippedShipments?.forEach(({ index, reasons }) => {
      const id = shipments[index || 0].id;
      skippedShipmentReasons[id] = reasons || [];
    });
    return skippedShipmentReasons;
  }

  private normalizeShipments(
    shipments: IShipment[],
    changeTime: number
  ): { shipments: Shipment[]; visitRequests: VisitRequest[] } {
    const visitRequestEntities: VisitRequest[] = [];
    const shipmentEntities = shipments.map((shipment, index) => {
      const pickups = [];
      const deliveries = [];

      const shipmentEntity: Shipment = {
        ...(shipment as any),
        id: index + 1,
        pickups,
        deliveries,
        changeTime,
      };

      // remap demands to loadDemands
      if (shipmentEntity.demands?.length > 0) {
        const newLoadDemands = shipmentEntity.demands.reduce(
          (prev, cur) => ({ ...prev, [cur.type]: { amount: cur.value } as ILoad }),
          {}
        ) as { [k: string]: ILoad };

        shipmentEntity.loadDemands = {
          ...newLoadDemands,
          ...shipmentEntity.loadDemands,
        };

        delete shipmentEntity.demands;
      }

      // pickups
      for (let i = 0, l = shipment.pickups?.length; i < l; i++) {
        const visitRequestEntity = {
          id: visitRequestEntities.length + index + 1,
          shipmentId: shipmentEntity.id,
          pickup: true,
          ...shipment.pickups[i],
          changeTime,
        };

        // remap locations to waypoints
        if (visitRequestEntity.arrivalLocation) {
          visitRequestEntity.arrivalWaypoint = {
            location: { latLng: visitRequestEntity.arrivalLocation },
          };
          delete visitRequestEntity.arrivalLocation;
        }
        if (visitRequestEntity.departureLocation) {
          visitRequestEntity.departureWaypoint = {
            location: { latLng: visitRequestEntity.departureLocation },
          };
          delete visitRequestEntity.departureLocation;
        }

        // remap demands to loadDemands
        if (visitRequestEntity.demands?.length > 0) {
          const demandsAsLoadDemands = visitRequestEntity.demands.reduce(
            (loadDemands, demand) => ({
              ...loadDemands,
              [demand.type]: { amount: demand.value } as ILoad,
            }),
            {}
          ) as { [k: string]: ILoad };

          visitRequestEntity.loadDemands = {
            ...demandsAsLoadDemands,
            ...visitRequestEntity.loadDemands,
          };

          delete visitRequestEntity.demands;
        }

        visitRequestEntities.push(visitRequestEntity);
        pickups.push(visitRequestEntity.id);
      }

      // deliveries
      for (let i = 0, l = shipment.deliveries?.length; i < l; i++) {
        const visitRequestEntity = {
          id: visitRequestEntities.length + index + 1,
          shipmentId: shipmentEntity.id,
          pickup: false,
          ...shipment.deliveries[i],
          changeTime,
        };

        // remap locations to waypoints
        if (visitRequestEntity.arrivalLocation) {
          visitRequestEntity.arrivalWaypoint = merge(visitRequestEntity.arrivalWaypoint, {
            location: { latLng: visitRequestEntity.arrivalLocation },
          });
          delete visitRequestEntity.arrivalLocation;
        }
        if (visitRequestEntity.departureLocation) {
          visitRequestEntity.departureWaypoint = merge(visitRequestEntity.departureWaypoint, {
            location: { latLng: visitRequestEntity.departureLocation },
          });
          delete visitRequestEntity.departureLocation;
        }

        // remap demands to loadDemands
        if (visitRequestEntity.demands?.length > 0) {
          const demandsAsLoadDemands = visitRequestEntity.demands.reduce(
            (loadDemands, demand) => ({
              ...loadDemands,
              [demand.type]: { amount: demand.value } as ILoad,
            }),
            {}
          ) as { [k: string]: ILoad };

          visitRequestEntity.loadDemands = {
            ...demandsAsLoadDemands,
            ...visitRequestEntity.loadDemands,
          };

          delete visitRequestEntity.demands;
        }

        visitRequestEntities.push(visitRequestEntity);
        deliveries.push(visitRequestEntity.id);
      }
      return shipmentEntity;
    });

    return { shipments: shipmentEntities, visitRequests: visitRequestEntities };
  }

  private normalizeShipmentRoutes(
    shipmentRoutes: IShipmentRoute[],
    vehicleIds: number[],
    shipments: Shipment[],
    changeTime: number
  ): { shipmentRoutes: ShipmentRoute[]; visits: Visit[] } {
    const visitEntities: Visit[] = [];
    const shipmentRouteEntities = shipmentRoutes.map((shipmentRoute) => {
      const shipmentRouteVisitIds = [];
      const vehicleId = vehicleIds[shipmentRoute.vehicleIndex || 0];
      const shipmentRouteEntity = {
        ...(shipmentRoute as any),
        id: vehicleId, // Shipment route id and vehicle id are equivalent
        visits: shipmentRouteVisitIds,
      } as ShipmentRoute;
      for (let i = 0, l = shipmentRoute.visits?.length; i < l; i++) {
        const visit = shipmentRoute.visits[i];
        const shipmentEntity = shipments[visit.shipmentIndex || 0];
        const visitRequests = visit.isPickup ? shipmentEntity.pickups : shipmentEntity.deliveries;
        const visitRequestId = visitRequests[visit.visitRequestIndex || 0];
        const visitEntity = {
          id: visitRequestId, // Visit id and visit request id are equivalent
          shipmentRouteId: shipmentRouteEntity.id,
          ...visit,
          changeTime,
        };
        visitEntities.push(visitEntity);
        shipmentRouteVisitIds.push(visitEntity.id);
      }
      return shipmentRouteEntity;
    });
    return { shipmentRoutes: shipmentRouteEntities, visits: visitEntities };
  }

  private normalizeVehicles(
    scenarioModel: IShipmentModel,
    breakRules: IBreakRule[],
    changeTime: number
  ): { vehicles: Vehicle[] } {
    if (!scenarioModel?.vehicles?.length) {
      return { vehicles: [] };
    }

    const normalizedVehicleArray = scenarioModel.vehicles.map((vehicle, index) => {
      const vehicleEntity: Vehicle = {
        id: index + 1,
        ...vehicle,
        changeTime,
      };

      // remap locations to waypoints
      if (vehicleEntity.startLocation) {
        vehicleEntity.startWaypoint = merge(vehicleEntity.startWaypoint, {
          location: { latLng: vehicleEntity.startLocation },
        });
        delete vehicleEntity.startLocation;
      }
      if (vehicleEntity.endLocation) {
        vehicleEntity.endWaypoint = merge(vehicleEntity.endWaypoint, {
          location: { latLng: vehicleEntity.endLocation },
        });
        delete vehicleEntity.endLocation;
      }

      // remap capacities to loadLimits
      if (vehicleEntity.capacities?.length > 0) {
        const capacitiesAsLimits = vehicleEntity.capacities.reduce(
          (limits, capacity) => ({
            ...limits,
            [capacity.type]: <ILoadLimit>{ maxLoad: capacity.value },
          }),
          {}
        ) as { [k: string]: ILoadLimit };

        vehicleEntity.loadLimits = {
          ...capacitiesAsLimits,
          ...vehicleEntity.loadLimits,
        };

        delete vehicleEntity.capacities;
      }

      //normalize Break Rules
      if (breakRules?.length > 0) {
        const newBreakRule = breakRules?.find(
          (breakRule: IBreakRule, index: number) => vehicleEntity.id === index + 1
        );
        if (vehicleEntity.breakRule) {
          const breakRequests = vehicleEntity.breakRule.breakRequests?.concat(
            newBreakRule.breakRequests
          );
          const frequencyConstraints = vehicleEntity.breakRule.frequencyConstraints?.concat(
            newBreakRule.frequencyConstraints
          );
          vehicleEntity.breakRule = { breakRequests, frequencyConstraints };
        } else {
          vehicleEntity.breakRule = newBreakRule;
        }
      }

      if (vehicleEntity.breakRuleIndices) {
        delete vehicleEntity.breakRuleIndices;
      }
      return vehicleEntity;
    });
    return { vehicles: normalizedVehicleArray };
  }

  private normalizeVehicleOperators(
    scenarioModel: IShipmentModel,
    changeTime: number
  ): { vehicleOperators: VehicleOperator[] } {
    if (!scenarioModel?.vehicleOperators?.length) {
      return { vehicleOperators: [] };
    }

    const normalizedVehicleOperatorsArray = scenarioModel.vehicleOperators.map(
      (vehicleOperator, index) => {
        const vehicleOperatorEntity: VehicleOperator = {
          id: index + 1,
          ...vehicleOperator,
          changeTime,
        };
        return vehicleOperatorEntity;
      }
    );
    return { vehicleOperators: normalizedVehicleOperatorsArray };
  }
}
