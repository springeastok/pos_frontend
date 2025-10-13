import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import QRCode from 'qrcode';
import BarcodeScanner from '../components/BarcodeScanner';
import styles from '../styles/Register.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Register() {
  const [cartItems, setCartItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState('product'); // 'product' or 'ec-stock'
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [pendingTransactionId, setPendingTransactionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ecStockResult, setEcStockResult] = useState(null);
  const [productNotFoundInScanner, setProductNotFoundInScanner] = useState(false);

  // 小計、消費税、合計を計算
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Math.floor(subtotal * 0.1);
  const totalAmount = subtotal + tax;

  // バーコード読み取り成功時の処理
  const handleBarcodeScanned = async (code) => {
    setError('');
    setLoading(true);
    setProductNotFoundInScanner(false);

    try {
      if (scanMode === 'product') {
        // 商品検索
        console.log('Searching for product:', code);
        const response = await fetch(`${API_URL}/api/products/search/${code}`);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          // 商品が見つからない - スキャナーは閉じずにエラー表示
          setProductNotFoundInScanner(true);
          setLoading(false);
          return;
        }

        const product = await response.json();
        console.log('Product found:', product);

        // スキャナーを閉じる
        setShowScanner(false);

        // カートに追加
        const existingItem = cartItems.find(item => item.CODE === product.CODE);
        
        if (existingItem) {
          setCartItems(cartItems.map(item =>
            item.CODE === product.CODE
              ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.PRICE }
              : item
          ));
        } else {
          setCartItems([...cartItems, {
            PRD_ID: product.PRD_ID,
            CODE: product.CODE,
            NAME: product.NAME,
            PRICE: product.PRICE,
            quantity: 1,
            subtotal: product.PRICE
          }]);
        }
      } else {
        // EC在庫確認
        const response = await fetch(`${API_URL}/api/products/ec-stock/${code}`);
        
        if (!response.ok) {
          setProductNotFoundInScanner(true);
          setLoading(false);
          return;
        }

        const ecStock = await response.json();
        
        // スキャナーを閉じてから結果表示
        setShowScanner(false);
        setEcStockResult(ecStock);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setProductNotFoundInScanner(true);
    } finally {
      setLoading(false);
    }
  };

  // 商品数量変更
  const updateQuantity = (code, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(code);
      return;
    }

    setCartItems(cartItems.map(item =>
      item.CODE === code
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.PRICE }
        : item
    ));
  };

  // 商品削除
  const removeItem = (code) => {
    setCartItems(cartItems.filter(item => item.CODE !== code));
  };

  // QRコード生成
  const generateQRCode = async () => {
    if (cartItems.length === 0) {
      setError('商品が選択されていません');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 会計データを作成
      const paymentData = {
        items: cartItems,
        total_amount: totalAmount
      };

      console.log('=== QRコード生成 ===');
      console.log('会計データ:', paymentData);

      // JSON文字列に変換してBase64エンコード（日本語対応）
      const jsonString = JSON.stringify(paymentData);
      console.log('JSON文字列:', jsonString);
      
      // 日本語を含む文字列をBase64エンコード
      const base64Encoded = btoa(unescape(encodeURIComponent(jsonString)));
      console.log('Base64エンコード後:', base64Encoded);

      // バックエンドAPIを使う場合
      // const response = await fetch(`${API_URL}/api/qrcode/generate`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(paymentData)
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.detail || 'QRコード生成に失敗しました');
      // }
      // 
      // const result = await response.json();
      // setPendingTransactionId(result.pending_transaction_id);

      // QRコード画像を生成（Base64エンコード済みデータから）
      const qrImage = await QRCode.toDataURL(base64Encoded, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeImage(qrImage);
      setShowQRCode(true);

    } catch (err) {
      console.error('QRコード生成エラー:', err);
      setError('QRコード生成に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // QRコード表示を閉じる（カートはクリアしない）
  const closeQRCode = () => {
    setShowQRCode(false);
    setQrCodeImage('');
  };

  // カートクリア
  const clearCart = () => {
    if (confirm('カートをクリアしますか?')) {
      setCartItems([]);
    }
  };

  // EC在庫確認を開始
  const startECStockCheck = () => {
    setScanMode('ec-stock');
    setEcStockResult(null);
    setShowScanner(true);
  };

  // 商品スキャンを開始
  const startProductScan = () => {
    setScanMode('product');
    setShowScanner(true);
  };

  return (
    <>
      <Head>
        <title>商品登録 - POS System</title>
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1>商品登録</h1>
          <Link href="/tablet" className={styles.tabletLink}>
            会計画面へ
          </Link>
        </header>

        {error && (
          <div className={styles.error}>
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className={styles.mainContent}>
          {/* 商品リスト */}
          <div className={styles.cartSection}>
            <div className={styles.cartHeader}>
              <h2>商品リスト</h2>
              <div className={styles.headerButtons}>
                <button 
                  className={styles.scanButton}
                  onClick={startProductScan}
                  disabled={loading}
                >
                  📷 商品スキャン
                </button>
                <button 
                  className={styles.ecStockButton}
                  onClick={startECStockCheck}
                  disabled={loading}
                >
                  📦 EC在庫確認
                </button>
              </div>
            </div>

            <div className={styles.cartItems}>
              {cartItems.length === 0 ? (
                <p className={styles.emptyCart}>商品をスキャンしてください</p>
              ) : (
                cartItems.map(item => (
                  <div key={item.CODE} className={styles.cartItem}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.NAME}</span>
                      <span className={styles.itemPrice}>¥{item.PRICE.toLocaleString()}</span>
                    </div>
                    <div className={styles.itemControls}>
                      <button 
                        onClick={() => updateQuantity(item.CODE, item.quantity - 1)}
                        className={styles.quantityBtn}
                      >
                        -
                      </button>
                      <span className={styles.quantity}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.CODE, item.quantity + 1)}
                        className={styles.quantityBtn}
                      >
                        +
                      </button>
                      <span className={styles.subtotal}>¥{item.subtotal.toLocaleString()}</span>
                      <button 
                        onClick={() => removeItem(item.CODE)}
                        className={styles.removeBtn}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 小計・消費税・合計表示 */}
            <div className={styles.totalSection}>
              <div className={styles.subtotalRow}>
                <span className={styles.subtotalLabel}>小計</span>
                <span className={styles.subtotalAmount}>¥{subtotal.toLocaleString()}</span>
              </div>
              <div className={styles.taxRow}>
                <span className={styles.taxLabel}>消費税（10%）</span>
                <span className={styles.taxAmount}>¥{tax.toLocaleString()}</span>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>合計</span>
                <span className={styles.totalAmount}>¥{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className={styles.actions}>
              <button 
                className={styles.clearBtn}
                onClick={clearCart}
                disabled={cartItems.length === 0}
              >
                クリア
              </button>
              <button 
                className={styles.checkoutBtn}
                onClick={generateQRCode}
                disabled={cartItems.length === 0 || loading}
              >
                {loading ? '生成中...' : '会計用QRコードを表示'}
              </button>
            </div>
          </div>
        </div>

        {/* バーコードスキャナーモーダル */}
        {showScanner && (
          <BarcodeScanner 
            onScan={handleBarcodeScanned}
            onClose={() => {
              setShowScanner(false);
              setProductNotFoundInScanner(false);
            }}
            mode={scanMode}
            productNotFound={productNotFoundInScanner}
          />
        )}

        {/* QRコード表示モーダル */}
        {showQRCode && (
          <div className={styles.modal}>
            <div className={styles.qrModalContent}>
              <h2>会計用QRコード</h2>
              <p className={styles.instruction}>
                店頭の会計用端末でこのQRコードをスキャンして会計してください
              </p>
              
              {qrCodeImage && (
                <div className={styles.qrCodeContainer}>
                  <img src={qrCodeImage} alt="QR Code" className={styles.qrCodeImage} />
                </div>
              )}

              <div className={styles.qrInfo}>
                <div className={styles.qrInfoRow}>
                  <span>合計金額:</span>
                  <span className={styles.qrAmount}>¥{totalAmount.toLocaleString()}</span>
                </div>
                <div className={styles.qrInfoRow}>
                  <span>商品数:</span>
                  <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}点</span>
                </div>
              </div>

              <button 
                className={styles.closeQRBtn}
                onClick={closeQRCode}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* EC在庫確認結果モーダル */}
        {ecStockResult && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>EC在庫確認</h2>
              
              <div className={styles.ecStockCard}>
                <div className={styles.ecStockRow}>
                  <span className={styles.label}>商品コード:</span>
                  <span>{ecStockResult.CODE}</span>
                </div>
                <div className={styles.ecStockRow}>
                  <span className={styles.label}>商品名:</span>
                  <span>{ecStockResult.NAME}</span>
                </div>
                <div className={styles.ecStockRow}>
                  <span className={styles.label}>標準価格:</span>
                  <span>¥{ecStockResult.std_PRICE.toLocaleString()}</span>
                </div>
                <div className={styles.ecStockRow}>
                  <span className={styles.label}>EC在庫数:</span>
                  <span className={styles.stockQuantity}>
                    {ecStockResult.ec_stock_quantity}個
                  </span>
                </div>
              </div>

              <button 
                className={styles.confirmBtn}
                onClick={() => setEcStockResult(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}