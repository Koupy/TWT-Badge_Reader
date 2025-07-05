import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Import NFC Manager avec les types nécessaires
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export default function HomeScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [tagData, setTagData] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcStatus, setNfcStatus] = useState<string>('Non initialisé');
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Animation values
  const pulseAnim = useSharedValue(1);
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);
  
  // Pulse animation style
  const pulseAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
      opacity: 2 - pulseAnim.value, // Fade out as it expands
    };
  });
  
  // Success animation style
  const successAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: successScale.value }],
      opacity: successOpacity.value,
    };
  });
  
  // Start pulse animation
  useEffect(() => {
    if (isScanning) {
      pulseAnim.value = withRepeat(
        withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1, // Infinite repeat
        true // Reverse
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [isScanning]);
  
  // Handle successful scan animation
  const handleSuccessAnimation = () => {
    // Stop pulse animation
    pulseAnim.value = 1;
    
    // Play haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Animate success icon
    successScale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.bounce }),
      withTiming(1, { duration: 200 })
    );
    
    successOpacity.value = withTiming(1, { duration: 300 });
    
    // Reset after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
      setTagData(null);
      successScale.value = withTiming(0);
      successOpacity.value = withTiming(0);
    }, 3000);
  };
  
  // Animation de scan
  useEffect(() => {
    if (isScanning) {
      // Démarrer l'animation de scan
      pulseAnim.value = withRepeat(
        withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1, // Répétition infinie
        true // Inverser
      );
    } else {
      // Arrêter l'animation
      pulseAnim.value = 1;
    }
  }, [isScanning]);
  
  // Initialiser NFC Manager avec une approche simplifiée
  useEffect(() => {
    const checkNfcSupport = async () => {
      try {
        setNfcStatus('Initialisation...');
        
        // Initialiser NFC Manager de manière simple
        console.log('Démarrage de NFC Manager...');
        await NfcManager.start();
        console.log('NFC Manager démarré avec succès');
        setNfcStatus('NFC Manager démarré');
        
        // Vérifier si NFC est supporté
        const supported = await NfcManager.isSupported();
        console.log('NFC supporté:', supported);
        setNfcSupported(supported);
        
        if (!supported) {
          console.log('NFC n\'est pas supporté sur cet appareil');
          setNfcStatus('NFC non supporté');
          setLastError('Cet appareil ne supporte pas le NFC');
          return;
        }  
        
        // Vérifier si NFC est activé (Android uniquement)
        if (Platform.OS === 'android') {
          const enabled = await NfcManager.isEnabled();
          console.log('NFC activé (Android):', enabled);
          if (!enabled) {
            Alert.alert(
              'NFC désactivé',
              'Veuillez activer NFC dans les paramètres de votre appareil pour utiliser cette fonctionnalité.',
              [{ text: 'OK' }]
            );
            setNfcStatus('NFC désactivé');
            setLastError('NFC est désactivé dans les paramètres');
            return;
          }
        } else {
          // iOS
          console.log('Appareil iOS détecté, NFC devrait être disponible');
          setNfcStatus('NFC prêt (iOS)');
        }
      } catch (ex: any) {
        console.warn('Erreur lors de l\'initialisation de NFC', ex);
        setNfcStatus('Erreur lors de l\'initialisation de NFC');
        setLastError(ex.message || 'Erreur inconnue');
      }
    };
    
    checkNfcSupport();
    
    return () => {
      // Nettoyer NFC Manager lors du démontage
      try {
        console.log('Nettoyage des ressources NFC...');
        NfcManager.cancelTechnologyRequest().catch(() => {});
        NfcManager.unregisterTagEvent().catch(() => {});
      } catch (e) {
        console.warn('Erreur lors du nettoyage NFC:', e);
      }
    };
  }, []);
  
  // Fonction pour démarrer le scan NFC
  const startScanning = () => {
    console.log('Démarrage du scan NFC...');
    startNfcScan();
  };
  
  // Fonction pour démarrer le scan NFC réel avec une approche simplifiée
  const startNfcScan = async () => {
    try {      
      setIsScanning(true);
      setShowSuccess(false);
      setTagData(null);
      setLastError(null);
      setNfcStatus('Scan en cours...');
      
      // Annuler toute opération NFC précédente
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      await NfcManager.unregisterTagEvent().catch(() => {});
      
      // Configurer un gestionnaire d'événements simple
      console.log('Configuration de la détection de tag...');
      NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: any) => {
        console.log('Tag détecté! Contenu:', JSON.stringify(tag));
        setNfcStatus('Badge détecté!');
        
        // Extraire l'ID du tag
        let id = '';
        try {
          if (tag && tag.id) {
            // Convertir l'ID en hexadécimal si c'est un tableau d'octets
            if (Array.isArray(tag.id)) {
              console.log('ID du tag est un tableau:', tag.id);
              id = Array.from(tag.id as number[])
                .map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2))
                .join(':').toUpperCase();
            } else {
              console.log('ID du tag est une valeur simple:', tag.id);
              id = String(tag.id);
            }
          } else if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
            // Essayer d'extraire l'ID du message NDEF si disponible
            console.log('Utilisation du message NDEF:', tag.ndefMessage);
            id = `NDEF-${Math.floor(Math.random() * 10000)}`;
          } else {
            console.log('Aucun ID de tag trouvé, génération d\'un ID aléatoire');
            id = `TAG-${Math.floor(Math.random() * 10000)}`;
          }
        } catch (e) {
          console.warn('Erreur lors de l\'extraction de l\'ID du tag:', e);
          id = `ERROR-TAG-${Math.floor(Math.random() * 10000)}`;
        }
        
        console.log('ID final du tag:', id);
        setTagData(id);
        setShowSuccess(true);
        setIsScanning(false);
        handleSuccessAnimation();
        
        // Arrêter la détection NFC après avoir trouvé un tag
        console.log('Arrêt de la détection NFC...');
        NfcManager.unregisterTagEvent().catch(() => 
          console.warn('Erreur lors de l\'arrêt de la détection NFC')
        );
      });
      
      // Démarrer la détection NFC avec une approche simplifiée
      console.log('Démarrage de la détection NFC...');
      await NfcManager.registerTagEvent();
      console.log('Détection NFC démarrée avec succès');
      // Pas d'alerte, juste mettre à jour le statut pour indiquer à l'utilisateur d'approcher son badge
      setNfcStatus('Approchez votre badge NFC/RFID...');
    } catch (ex: any) {
      console.warn('Erreur lors du scan NFC', ex);
      setIsScanning(false);
      setNfcStatus('Erreur de scan');
      setLastError(ex?.message || 'Erreur inconnue');
    }
  };
  
  return (
    <View style={styles.container}>
      {!showSuccess ? (
        <>
          <Text style={styles.title}>Scanner votre badge</Text>
          <Text style={styles.subtitle}>Approchez votre téléphone du badge NFC/RFID</Text>
          
          <View style={styles.scannerContainer}>
            <FontAwesome name="wifi" size={80} color="#3498db" />
            <Animated.View style={[styles.pulseCircle, pulseAnimStyle]} />
          </View>
          
          <Text style={styles.instruction}>Maintenez votre téléphone près du badge...</Text>
          
          {/* Statut NFC */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Statut NFC: <Text style={styles.statusValue}>{nfcStatus}</Text></Text>
            {lastError && <Text style={styles.errorText}>Erreur: {lastError}</Text>}
            {tagData && <Text style={styles.statusText}>Détails du badge: <Text style={styles.tagValue}>{tagData}</Text></Text>}
          </View>
          
          {/* Boutons pour les actions */}
          <View style={styles.buttonContainer}>
            {!isScanning ? (
              <TouchableOpacity 
                style={styles.button} 
                onPress={startScanning}
              >
                <Text style={styles.buttonText}>Démarrer le scan</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.button, styles.successButton]} 
                disabled={true}
              >
                <Text style={styles.buttonText}>En attente du badge...</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successIconContainer, successAnimStyle]}>
            <FontAwesome name="check-circle" size={100} color="#2ecc71" />
          </Animated.View>
          <Text style={styles.successText}>Badge détecté !</Text>
          {tagData && <Text style={styles.tagInfo}>ID: {tagData}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    marginVertical: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    width: '100%',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  statusValue: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  tagValue: {
    fontWeight: 'bold',
    color: '#27ae60',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 5,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  scannerContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  pulseCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    position: 'absolute',
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: '#2ecc71',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f39c12',
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14,
  },
  successContainer: {
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginBottom: 10,
  },
  tagInfo: {
    fontSize: 16,
    color: '#666',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    marginTop: 10,
  },
});
