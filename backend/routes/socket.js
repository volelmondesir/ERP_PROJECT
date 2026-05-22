let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => {
  return ioInstance;
};

export const emitDashboardUpdate = () => {
  if (ioInstance) {
    ioInstance.emit("dashboardUpdated");
    ioInstance.emit("salesUpdated");
  }
};