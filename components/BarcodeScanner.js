import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import styles from '../styles/BarcodeScanner.module.css';

export default function BarcodeScanner({ 
  onScan, 
  onClose, 
  onTimeout,
  mode = 'product', 
  tabletMode = false,
  productNotFound: externalProductNotFound 
}) {
  const videoRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const [codeReader, setCodeReader] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [scanTimeout, setScanTimeout] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [productNotFound, setProductNotFound] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false); // ② 追加

  // 親コンポーネントからのエラーを監視
  useEffect(() => {
    if (externalProductNotFound) {
      setProductNotFound(true);
      setScannedResult(null);
    }
  }, [externalProductNotFound]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    setCodeReader(reader);

    if (tabletMode) {
      startCameraAndScan(reader);
    } else {
      startCamera(reader);
    }

    return () => {
      if (reader) {
        reader.reset();
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [tabletMode]);

  const startCamera = async (reader) => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      setError(err.message || 'カメラの起動に失敗しました');
    }
  };

  const startCameraAndScan = async (reader) => {
    try {
      setError('');
      setIsScanning(true);
      setCameraReady(true);
      const timeoutDuration = tabletMode ? 10000 : 8000;

      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
        
        if (tabletMode) {
          setScanFailed(true);
          setTimeout(() => {
            if (reader) reader.reset();
            if (onTimeout) onTimeout();
            else onClose();
          }, 2000);
        } else {
          setScanTimeout(true);
          if (reader) {
            reader.reset();
            startCamera(reader);
          }
        }
      }, timeoutDuration);

      reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        (result, err) => {
          if (result) {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            const code = result.getText();
            if (mode === 'qr') {
              if (tabletMode) {
                setIsScanning(false);
                if (reader) reader.reset();
                onScan(code);
              } else {
                handleScanSuccess(code, 'qr');
              }
            } else {
              const numericCode = parseInt(code.replace(/\D/g, ''));
              if (numericCode) handleScanSuccess(numericCode, 'product');
            }
          }
          if (err && !(err.name === 'NotFoundException')) {
            console.error(err);
          }
        }
      );
    } catch (err) {
      setError(err.message || 'スキャンに失敗しました');
      setIsScanning(false);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    }
  };

  const startScanning = async () => {
    if (!codeReader || !cameraReady) return;

    setIsScanning(true);
    setError('');
    setScanTimeout(false);
    setProductNotFound(false);

    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      setScanTimeout(true);
      if (codeReader) {
        codeReader.reset();
        startCamera(codeReader);
      }
    }, 8000);

    try {
      codeReader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        (result, err) => {
          if (result) {
            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
            const code = result.getText();
            if (mode === 'qr') {
              handleScanSuccess(code, 'qr');
            } else {
              const numericCode = parseInt(code.replace(/\D/g, ''));
              if (numericCode) handleScanSuccess(numericCode, 'product');
            }
          }
          if (err && !(err.name === 'NotFoundException')) {
            console.error(err);
          }
        }
      );
    } catch (err) {
      setError(err.message || 'スキャンに失敗しました');
      setIsScanning(false);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    }
  };

  // ①, ② 修正箇所
  const handleScanSuccess = (data, type) => {
    setIsScanning(false);
    setShowSuccessMessage(true); // メッセージを表示
    setScannedResult({ type, data });

    // ビデオストリームを停止してフレームを固定
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
    // codeReader.reset() はここでは呼び出さない
  };

  const handleAdd = async () => {
    if (!scannedResult) return;
    onScan(scannedResult.data);
  };

  const handleManualSubmit = () => {
    const code = parseInt(manualCode);
    if (!code || manualCode.length < 8) {
      setError('8桁以上の数字を入力してください');
      return;
    }
    setShowManualInput(false);
    setManualCode('');
    setScanTimeout(false);
    handleScanSuccess(code, 'product');
  };

  const handleBackToCamera = () => {
    setScanTimeout(false);
    setScannedResult(null);
    setShowManualInput(false);
    setManualCode('');
    setProductNotFound(false);
    setIsScanning(false);
    setShowSuccessMessage(false); // メッセージを非表示
    if (codeReader) {
      codeReader.reset();
      startCamera(codeReader);
    }
  };

  const handleClose = () => {
    if (codeReader) {
      codeReader.reset();
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    onClose();
  };

  const getTitle = () => {
    switch(mode) {
      case 'qr': return 'QRコードスキャン';
      case 'ec-stock': return 'バーコードスキャン';
      default: return 'バーコードスキャン';
    }
  };

  const getInstruction = () => {
    if (scannedResult || scanTimeout || showManualInput || productNotFound) return '';
    
    switch(mode) {
      case 'qr': return 'QRコードをカメラに映してください';
      case 'ec-stock': return 'バーコードをカメラに映してください';
      default: return 'バーコードをカメラに映してください';
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.scannerContainer}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={handleClose}>
            ← 戻る
          </button>
          <h2>{getTitle()}</h2>
        </div>

        <div className={styles.content}>
          <h3 className={styles.sectionTitle}>カメラ</h3>

          <div className={styles.videoContainer}>
            <video 
              ref={videoRef} 
              className={styles.video}
              autoPlay
              playsInline
            />
            {!tabletMode && !scannedResult && !isScanning && !scanTimeout && !showManualInput && !productNotFound && cameraReady && (
              <div className={styles.cameraOverlay}>
                <div className={styles.cameraIcon}>📷</div>
                <p>{getInstruction()}</p>
              </div>
            )}
            {isScanning && <div className={styles.scanLine}></div>}
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          {tabletMode && scanFailed && (
            <div className={styles.scanFailedMessage}>
              QRコードを読み取れませんでした
            </div>
          )}

          {!tabletMode && !scannedResult && !scanTimeout && !showManualInput && !productNotFound && cameraReady && (
            <button 
              className={styles.scanBtn}
              onClick={startScanning}
              disabled={isScanning}
            >
              {isScanning ? 'スキャン中...' : 'スキャン開始'}
            </button>
          )}

          {!tabletMode && scanTimeout && !showManualInput && (
            <div className={styles.timeoutCard}>
              <p className={styles.timeoutMessage}>スキャンできません</p>
              <div className={styles.timeoutActions}>
                <button 
                  className={styles.backToScanBtn}
                  onClick={handleBackToCamera}
                >
                  戻る
                </button>
                <button 
                  className={styles.manualInputBtn}
                  onClick={() => setShowManualInput(true)}
                >
                  📝 直接入力
                </button>
              </div>
            </div>
          )}

          {!tabletMode && showManualInput && (
            <div className={styles.manualInputCard}>
              <label className={styles.inputLabel}>バーコード番号を入力</label>
              <input
                type="number"
                className={styles.input}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="例: 1234567890123"
                autoFocus
              />
              <div className={styles.manualActions}>
                <button 
                  className={styles.backToScanBtn}
                  onClick={handleBackToCamera}
                >
                  戻る
                </button>
                <button 
                  className={styles.submitBtn}
                  onClick={handleManualSubmit}
                >
                  確定
                </button>
              </div>
            </div>
          )}

          {!tabletMode && productNotFound && (
            <div className={styles.errorCard}>
              <p className={styles.errorMessage}>この商品は登録できません</p>
              <button 
                className={styles.backBtn2}
                onClick={handleBackToCamera}
              >
                戻る
              </button>
            </div>
          )}

          {/* ② 修正箇所 */}
          {!tabletMode && scannedResult && !productNotFound && (
            <div className={styles.resultCard}>
              {showSuccessMessage && <p className={styles.successMessage}>スキャンできました</p>}
              
              {scannedResult.type === 'product' && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>バーコード</span>
                  <span className={styles.resultValue}>{scannedResult.data}</span>
                </div>
              )}
              
              <div className={styles.resultActions}>
                <button 
                  className={styles.rescanBtn}
                  onClick={handleBackToCamera}
                >
                  再スキャン
                </button>
                <button 
                  className={styles.addBtn}
                  onClick={handleAdd}
                >
                  {mode === 'ec-stock' ? 'EC在庫確認' : '追加'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
