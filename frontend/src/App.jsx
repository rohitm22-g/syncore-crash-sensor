import React, { useState } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LiveSensorsPage } from './pages/LiveSensorsPage';
import { DetectionEventsPage } from './pages/DetectionEventsPage';
import { EventHistoryPage } from './pages/EventHistoryPage';
import { DeviceSettingsPage } from './pages/DeviceSettingsPage';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const {
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
    clearEventHistory,
    fetchAvailablePorts,
    connectHardware,
    disconnectHardware,
    fetchDeviceStatus
  } = useTelemetry();

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      telemetry={telemetry}
      connection={connection}
      onResetAlarm={resetAlarm}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage
          telemetry={telemetry}
          chartData={chartData}
          events={events}
          connection={connection}
          onResetAlarm={resetAlarm}
          onManualAlarmTest={triggerManualAlarmTest}
          onTriggerScenario={triggerScenario}
          onToggleDataSource={setDataSource}
          onNavigate={setActiveTab}
        />
      )}

      {activeTab === 'live-sensors' && (
        <LiveSensorsPage
          telemetry={telemetry}
          chartData={chartData}
          onCalibrate={calibrate}
        />
      )}

      {activeTab === 'detection-events' && (
        <DetectionEventsPage
          telemetry={telemetry}
          events={events}
          onResetAlarm={resetAlarm}
          onManualAlarmTest={triggerManualAlarmTest}
          onTriggerScenario={triggerScenario}
        />
      )}

      {activeTab === 'event-history' && (
        <EventHistoryPage
          events={events}
          onClearHistory={clearEventHistory}
        />
      )}

      {activeTab === 'device-settings' && (
        <DeviceSettingsPage
          telemetry={telemetry}
          connection={connection}
          onSetMonitoringStatus={setMonitoringStatus}
          onUpdateThresholds={updateThresholds}
          onCalibrate={calibrate}
          onToggleDataSource={setDataSource}
          onFetchAvailablePorts={fetchAvailablePorts}
          onConnectHardware={connectHardware}
          onDisconnectHardware={disconnectHardware}
          onFetchDeviceStatus={fetchDeviceStatus}
        />
      )}
    </MainLayout>
  );
}

export default App;
