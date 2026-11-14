import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/dataService';

export function useTelemetry() {
  const [telemetry, setTelemetry] = useState(dataService.latestTelemetry);
  const [chartData, setChartData] = useState([]);
  const [events, setEvents] = useState(dataService.getEventHistory());
  const [connection, setConnection] = useState({
    source: dataService.source,
    state: dataService.source === 'DEMO' ? 'demo' : dataService.connectionState
  });

  useEffect(() => {
    const unsubTelemetry = dataService.subscribeTelemetry((newTelemetry, buffer) => {
      setTelemetry({ ...newTelemetry });
      setChartData(buffer);
    });

    const unsubEvent = dataService.subscribeEvent((_, fullHistory) => {
      setEvents([...fullHistory]);
    });

    const unsubConn = dataService.subscribeConnection((conn) => {
      setConnection(conn);
    });

    return () => {
      unsubTelemetry();
      unsubEvent();
      unsubConn();
    };
  }, []);

  const resetAlarm = useCallback(() => dataService.resetAlarm(), []);
  const triggerManualAlarmTest = useCallback(() => dataService.triggerManualAlarmTest(), []);
  const triggerScenario = useCallback((scenario) => dataService.triggerScenario(scenario), []);
  const setMonitoringStatus = useCallback((status) => dataService.setMonitoringStatus(status), []);
  const updateThresholds = useCallback((thresholds) => dataService.updateThresholds(thresholds), []);
  const calibrate = useCallback(() => dataService.calibrate(), []);
  const setDataSource = useCallback((src) => dataService.setDataSource(src), []);
  const clearEventHistory = useCallback(() => dataService.clearEventHistory(), []);

  return {
    telemetry,
    chartData,
    events,
    connection,
    resetAlarm,
    triggerManualAlarmTest,
    triggerScenario,
    setMonitoringStatus,
    updateThresholds,
    calibrate,
    setDataSource,
    clearEventHistory
  };
}
