import { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import type { ObjectDetection } from '@tensorflow-models/coco-ssd';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Prediction = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

type DetectionHistory = {
  id: string;
  objects: string[];
  createdAt: string;
};

function App() {
  const [loading, setLoading] = useState({ model: true, message: 'Chargement du modèle Coco-SSD...' });
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [history, setHistory] = useState<DetectionHistory[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<ObjectDetection | null>(null);

  // Dessine les prédictions sur le canvas
  const drawResults = useCallback((preds: Prediction[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    preds.forEach(p => {
      const [x, y, width, height] = p.bbox;
      const text = `${p.class} (${Math.round(p.score * 100)}%)`;
      ctx.strokeStyle = '#48BB78';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = '#48BB78';
      ctx.font = '16px sans-serif';
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x, y, textWidth + 8, 24);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, x + 4, y + 16);
    });
  }, []);

  // Lance la détection d'objets en continu
  const detectObjects = useCallback(async () => {
    const video = videoRef.current;
    if (video && video.readyState === 4 && modelRef.current) {
      const preds = await modelRef.current.detect(video);
      setPredictions(preds);
      drawResults(preds);
    }
    requestAnimationFrame(detectObjects);
  }, [drawResults]);

  // Active la webcam
  const setupWebcam = useCallback(async () => {
    try {
      setLoading({ model: true, message: 'Activation de la webcam...' });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', () => {
          setLoading({ model: false, message: '' });
          detectObjects();
        });
      }
    } catch (err) {
      console.error("Webcam error:", err);
      setLoading({ model: true, message: "Erreur d'accès à la webcam." });
    }
  }, [detectObjects]);

  // Charge le modèle Coco-SSD
  const loadModel = useCallback(async () => {
    try {
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      await tf.setBackend('webgl');
      modelRef.current = await cocoSsd.load();
      await setupWebcam();
    } catch (err) {
      console.error("Model load error:", err);
      setLoading({ model: true, message: "Échec du chargement du modèle." });
    }
  }, [setupWebcam]);

  // Récupère l'historique depuis le backend
  const fetchHistory = async () => {
    try {
      const res = await axios.get(API_URL + '/api/detections');
      setHistory(res.data);
    } catch (err) {
      console.error("Historique erreur:", err);
    }
  };

  // Sauvegarde les objets détectés
  const handleSave = async () => {
    const detected = predictions.map(p => p.class);
    if (detected.length === 0) return;

    setIsSaving(true);
    try {
      await axios.post(API_URL + '/api/detections', { objects: detected });
      await fetchHistory();
    } catch (err) {
      console.error("Sauvegarde erreur:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Initialisation du modèle et chargement historique
  useEffect(() => {
    loadModel();
    fetchHistory();
  }, [loadModel]);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-green-400">VisionClerk</h1>
        <p className="text-gray-400 mt-2">Votre assistant de bureau intelligent</p>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-2xl p-4 relative overflow-hidden" style={{ aspectRatio: '640 / 480' }}>
          {loading.model && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
              <div className="text-center">
                <p className="text-xl">{loading.message}</p>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mt-4" />
              </div>
            </div>
          )}
          <video ref={videoRef} autoPlay muted playsInline width={640} height={480} className="rounded-md absolute top-0 left-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
          <canvas ref={canvasRef} width={640} height={480} className="rounded-md absolute top-0 left-0 w-full h-full" style={{ zIndex: 10 }} />
        </div>

        <div className="bg-gray-800 rounded-lg shadow-2xl p-6 flex flex-col space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-green-400 mb-3">Objets Détectés</h2>
            <div className="bg-gray-700 rounded-md p-3 h-40 overflow-y-auto">
              {predictions.length > 0 ? (
                <ul className="space-y-2">
                  {predictions.map((p, i) => (
                    <li key={i} className="text-gray-300">
                      {p.class} <span className="text-green-500 font-mono text-sm">({(p.score * 100).toFixed(1)}%)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Aucun objet détecté.</p>
              )}
            </div>
            <button onClick={handleSave} disabled={isSaving || predictions.length === 0} className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
              {isSaving ? 'Sauvegarde...' : "Sauvegarder l'Analyse"}
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-green-400 mb-3">Historique</h2>
            <div className="bg-gray-700 rounded-md p-3 h-64 overflow-y-auto">
              {history.length > 0 ? (
                <ul className="space-y-3">
                  {history.map(item => (
                    <li key={item.id} className="text-gray-300 border-b border-gray-600 pb-2">
                      <p className="font-mono text-xs text-green-500">{new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                      <p className="mt-1">{item.objects.join(', ')}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Aucun historique.</p>
              )}
            </div>
            <button onClick={fetchHistory} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
              Rafraîchir l'Historique
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
