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

    // タブレットモードでは自動的にスキャン開始
    if (tabletMode) {
      startCameraAndScan(reader);
    } else {
      // 通常モードではカメラプレビューのみ
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

      // カメラプレビューのみ表示 (facingMode を使用)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
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

      // タブレットモードでは10秒、通常モードでは8秒
      const timeoutDuration = tabletMode ? 10000 : 8000;

      // タイムアウトを設定
      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
        
        if (tabletMode) {
          // タブレットモード: 失敗メッセージを2秒表示後に閉じる
          setScanFailed(true);
          setTimeout(() => {
            if (reader) {
              reader.reset();
            }
            if (onTimeout) {
              onTimeout();
            } else {
              onClose();
            }
          }, 2000);
        } else {
          // 通常モード: タイムアウト画面を表示
          setScanTimeout(true);
          if (reader) {
            reader.reset();
            startCamera(reader);
          }
        }
      }, timeoutDuration);

      // スキャン開始 (decodeFromConstraints を使用)
      reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, err) => {
          if (result) {
            // タイムアウトをクリア
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
            }

            const code = result.getText();
            
            if (mode === 'qr') {
              // QRコードモード
              if (tabletMode) {
                // タブレットモード: 即座に親に渡す（ダイアログなし）
                setIsScanning(false);
                if (reader) {
                  reader.reset();
                }
                onScan(code);
              } else {
                // 通常モード: 確認ダイアログを表示
                handleScanSuccess(code, 'qr');
              }
            } else {
              // 商品/EC在庫モード: 数字のみ抽出
              const numericCode = parseInt(code.replace(/\D/g, ''));
              
              if (numericCode) {
                handleScanSuccess(numericCode, 'product');
              }
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
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    }
  };

  const startScanning = async () => {
    if (!codeReader || !cameraReady) return;

    setIsScanning(true);
    setError('');
    setScanTimeout(false);
    setProductNotFound(false);

    // 8秒のタイムアウトを設定
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      setScanTimeout(true);
      if (codeReader) {
        codeReader.reset();
        startCamera(codeReader);
      }
    }, 8000);

    try {
      // スキャン開始 (decodeFromConstraints を使用)
      codeReader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, err) => {
          if (result) {
            // タイムアウトをクリア
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
            }

            const code = result.getText();
            
            if (mode === 'qr') {
              // QRコードモード
              handleScanSuccess(code, 'qr');
            } else {
              // 商品/EC在庫モード: 数字のみ抽出
              const numericCode = parseInt(code.replace(/\D/g, ''));
              
              if (numericCode) {
                handleScanSuccess(numericCode, 'product');
              }
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
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    }
  };

  const handleScanSuccess = (data, type) => {
    setIsScanning(false);
    setScannedResult({ type, data });
    if (codeReader) {
      codeReader.reset();
    }
  };

  const handleAdd = async () => {
    if (!scannedResult) return;
    // 商品コードを親に渡す（検証は親コンポーネントで行う）
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
      case 'qr':
        return 'QRコードスキャン';
      case 'ec-stock':
        return 'バーコードスキャン';
      default:
        return 'バーコードスキャン';
    }
  };

  const getInstruction = () => {
    if (scannedResult || scanTimeout || showManualInput || productNotFound) return '';
    
    switch(mode) {
      case 'qr':
        return 'QRコードをカメラに映してください';
      case 'ec-stock':
        return 'バーコードをカメラに映してください';
      default:
        return 'バーコードをカメラに映してください';
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

          {/* タブレットモード: スキャン失敗メッセージ */}
          {tabletMode && scanFailed && (
            <div className={styles.scanFailedMessage}>
              QRコードを読み取れませんでした
            </div>
          )}

          {/* 通常モード: スキャン開始ボタン */}
          {!tabletMode && !scannedResult && !scanTimeout && !showManualInput && !productNotFound && cameraReady && (
            <button 
              className={styles.scanBtn}
              onClick={startScanning}
              disabled={isScanning}
            >
              {isScanning ? 'スキャン中...' : 'スキャン開始'}
            </button>
          )}

          {/* タイムアウト時の表示（通常モードのみ） */}
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

          {/* 直接入力フォーム（通常モードのみ） */}
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

          {/* 商品が見つからない時の表示（通常モードのみ） */}
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

          {/* スキャン成功時の表示（通常モードのみ） */}
          {!tabletMode && scannedResult && !productNotFound && (
            <div className={styles.resultCard}>
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
