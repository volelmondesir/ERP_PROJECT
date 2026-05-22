import axios from "axios";

const API = "/api";

type AuditLogProps = {
  moduleName: string;
  submenuName: string;
  actionType: string;
};

export const saveAuditLog = async ({
  moduleName,
  submenuName,
  actionType,
}: AuditLogProps) => {

  try {

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    await axios.post(`${API}/audit-log`, {

      username: user.username || "Unknown",

      fullName: user.fullName || "",

      moduleName,

      submenuName,

      actionType,

      computerName: navigator.platform,

      browserInfo: navigator.userAgent,
    });

  } catch (err) {

    console.log("AUDIT LOG ERROR 👉", err);
  }
};
