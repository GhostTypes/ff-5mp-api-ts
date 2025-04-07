// src/tcpapi/client/GCodes.ts
export class GCodes {
    public static readonly CmdLogin = "~M601 S1";
    public static readonly CmdLogout = "~M602";

    public static readonly CmdPrintStatus = "~M27";
    public static readonly CmdEndstopInfo = "~M119";
    public static readonly CmdInfoStatus = "~M115";
    public static readonly CmdInfoXyzab = "~M114";
    public static readonly CmdTemp = "~M105";

    public static readonly CmdRunoutSensorOn = "~M405";
    public static readonly CmdRunoutSensorOff = "~M406";

    public static readonly CmdListLocalFiles = "~M661";
    public static readonly CmdGetThumbnail = "~M662";

    public static readonly TakePicture = "~M240";

    public static readonly CmdHomeAxes = "~G28";
}