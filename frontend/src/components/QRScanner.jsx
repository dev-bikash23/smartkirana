import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";

export default function QRScanner({ onClose }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | scanning | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(null);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
          setCameras(devices);
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
          );
          if (backCam) {
            setCameraId(backCam.id);
          } else if (devices.length > 1) {
            setCameraId(devices[1].id);
          } else {
            setCameraId(devices[0].id);
          }
        } else {
          setErrorMsg("No camera detected on this hardware.");
          setStatus("error");
        }
      })
      .catch(() => {
        setErrorMsg("Camera access was explicitly denied.");
        setStatus("error");
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = () => {
    if (!cameraId) return;
    setStatus("scanning");
    setResult(null);
    setErrorMsg("");

    const html5Qr = new Html5Qrcode("qr-scanner-region");
    html5QrRef.current = html5Qr;

    html5Qr
      .start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScanner();
          handleScan(decodedText);
        },
        () => {}
      )
      .catch((err) => {
        setStatus("error");
        setErrorMsg("Camera subsystem error: " + err);
      });
  };

  const stopScanner = () => {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {});
      html5QrRef.current = null;
    }
  };

  const handleScan = async (decodedText) => {
    try {
      const payload = JSON.parse(decodedText);
      if (!payload.product_id) {
        setStatus("error");
        setErrorMsg("Invalid payload format. Expected product_id.");
        return;
      }
      const res = await axios.post("/inventory/scan", payload);
      setResult(res.data);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.detail || err.message || "Network synchronization failure.");
    }
  };

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-[100] p-6">
      <div className="w-full max-w-lg glass-panel-strong overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl filter drop-shadow-[0_0_10px_rgba(0,255,198,0.5)]">📷</div>
            <div>
              <h2 className="text-white font-black text-xl tracking-tight uppercase">Optical Interface</h2>
              <p className="text-[#8B949E] text-xs font-bold uppercase tracking-widest opacity-60">Synchronize Physical Inventory</p>
            </div>
          </div>
          <button onClick={() => { stopScanner(); onClose(); }} className="text-2xl opacity-40 hover:opacity-100 transition-opacity">✕</button>
        </div>

        <div className="p-8">
          {/* Camera Selector */}
          {cameras.length > 1 && status === "idle" && (
            <div className="mb-8">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-1">Hardware Source</label>
              <select
                className="input-grocery w-full bg-[#0B0F14] py-4"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Device ${cam.id.substring(0, 8)}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* Viewfinder */}
          <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl border border-[rgba(255,255,255,0.05)]"
            style={{
              width: "100%",
              minHeight: status === "scanning" ? "300px" : "0px",
              display: status === "scanning" ? "block" : "none",
            }}>
            <div id="qr-scanner-region" style={{ width: "100%", minHeight: "300px" }} />
            {status === "scanning" && (
              <div className="absolute left-0 right-0 h-0.5 bg-[#00FFC6] shadow-[0_0_8px_#00FFC6] animate-scan z-10" />
            )}
          </div>

          {/* Idle State */}
          {status === "idle" && (
            <div className="text-center py-10">
              <div className="w-24 h-24 mx-auto rounded-[2.5rem] bg-gradient-to-br from-[#00FFC6] to-[#00B894] flex items-center justify-center text-4xl mb-8 shadow-[0_0_40px_rgba(0,255,198,0.2)] animate-float">
                ✨
              </div>
              <p className="text-[#8B949E] mb-10 leading-relaxed max-w-xs mx-auto">
                Ready to initialize optical scan. Position the product QR code within the viewfinder.
              </p>
              <button onClick={startScanner} className="btn-grocery-primary w-full py-5 text-lg font-black">
                INITIALIZE CAMERA
              </button>
            </div>
          )}

          {/* Scanning UI */}
          {status === "scanning" && (
            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(0,255,198,0.1)] border border-[rgba(0,255,198,0.2)] text-[#00FFC6] text-xs font-bold uppercase tracking-widest animate-pulse">
                <span className="w-2 h-2 bg-[#00FFC6] rounded-full"></span>
                Optical Stream Active
              </div>
              <button onClick={() => { stopScanner(); setStatus("idle"); }} className="btn-grocery-secondary w-full py-4 font-bold">
                ABORT MISSION
              </button>
            </div>
          )}

          {/* Success State */}
          {status === "success" && result && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="p-8 rounded-3xl bg-[#00FFC6]/5 border border-[#00FFC6]/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFC6]/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <div className="text-5xl mb-4">✨</div>
                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{result.product_name}</h3>
                <p className="text-[#00FFC6] font-bold text-sm tracking-widest uppercase opacity-80">Sync Complete</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-4 text-center border-opacity-10">
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#4A5568] mb-1">New Volume</p>
                  <p className="text-2xl font-black text-[#00FFC6]">{result.new_stock}</p>
                </div>
                <div className="glass-panel p-4 text-center border-opacity-10">
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#4A5568] mb-1">Unit Price</p>
                  <p className="text-2xl font-black text-white">₹{result.price}</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={reset} className="btn-grocery-secondary flex-1 py-4 font-bold">SCAN NEXT</button>
                <button onClick={() => { stopScanner(); onClose(); }} className="btn-grocery-primary flex-1 py-4 font-black">CLOSE</button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="space-y-8 animate-fade-in-up text-center">
              <div className="w-20 h-20 mx-auto rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                ⚠️
              </div>
              <div>
                <p className="text-xl font-black text-white mb-2 uppercase">Optical Failure</p>
                <p className="text-red-400/80 text-sm leading-relaxed max-w-xs mx-auto">{errorMsg}</p>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={reset} className="btn-grocery-secondary flex-1 py-4 font-bold">RETRY</button>
                <button onClick={() => { stopScanner(); onClose(); }} className="btn-grocery-primary flex-1 py-4 font-black">DISMISS</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
