import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  TextInput, Alert, ScrollView, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, Modal, FlatList, Dimensions, Animated, Easing 
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';
import { STATIONS } from './stations';
import { Session } from '@supabase/supabase-js';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { scale, moderateScale } from './scaling'; 

const Theme = {
  light: { background: '#ffffff', text: '#000000', inputBg: '#ffffff', border: '#000000', placeholder: '#888' },
  dark: { background: '#121212', text: '#ffffff', inputBg: '#1e1e1e', border: '#444444', placeholder: '#bbb' }
};
const { width, height } = Dimensions.get('window');

export default function App() {
  const { width, height } = Dimensions.get('window');
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentTab, setCurrentTab] = useState<'make' | 'view'>('view');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // FIX: Added useEffect to recover session and stay logged in 
  useEffect(() => {
    // Check for an existing session immediately on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const Theme = {
  light: {
    background: '#ffffff',
    text: '#000000',
    card: '#f9f9f9',
    border: '#000000',
    inputBg: '#ffffff',
    placeholder: '#888',
    icon: '#000000'
  },
  dark: {
    background: '#000000ff',
    text: '#ffffff',
    card: '#000000ff',
    border: '#ffffffff',
    inputBg: '#000000ff',
    placeholder: '#888',
    icon: '#ffffff'
  }
};
  const colors = isDarkMode ? Theme.dark : Theme.light;
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  const [currentStationFilter, setCurrentStationFilter] = useState('');
  const [selectedStationId, setSelectedStationId] = useState<number | string>('');
  const [tcStatus, setTcStatus] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [stationSearchText, setStationSearchText] = useState('');

  const [showPolicy, setShowPolicy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  // --- ANIMATION & MENU STATES ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width)).current;
  // Initial position: hidden to the left

  const toggleMenu = (open: boolean) => {
    if (open) {
      setIsMenuOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0, // Slide into view
        duration: 350,
        easing: Easing.out(Easing.back(1)), // Subtle bounce effect
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width, // Slide back out
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => setIsMenuOpen(false));
    }
  };

  // 2. AUTH ACTIONS - UPDATED FOR OTP ON LOGIN
  async function handleLogin() {
  // 1. Check if fields are empty
  if (!email || !password) {
    return Alert.alert("Error", "BRO, please enter both email and password!");
  }
  
  setLoading(true);
  
  // 2. Verify password with Supabase first
  const { data, error: pwError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (pwError) {
    setLoading(false);
    return Alert.alert("Login Failed", "Incorrect password. Please try again.");
  }

  // 3. Password is correct! Now send the OTP
  const { error: otpError } = await supabase.auth.signInWithOtp({ email });
  if (otpError) {
    Alert.alert("Error", otpError.message);
  } else {
    // IMPORTANT: Sign out the session created by 'signInWithPassword' 
    // so they are forced to verify the OTP to actually get in.
    await supabase.auth.signOut();
    setSession(null); 
    
    Alert.alert("Step 1 Complete", "Password correct! Now enter the 6-digit OTP sent to your email.");
    setShowOtpInput(true); 
  }
  setLoading(false);
  }

  async function handleSignup() {
    if (!email || !password) return Alert.alert("Error", "Enter email and password");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert("Signup Failed", error.message);
    } else {
      Alert.alert("Verify Email", "A 6-digit code has been sent to your email.");
      setShowOtpInput(true);
    }
    setLoading(false);
  }

  async function handleSendOTP() {
    if (!email) return Alert.alert("Error", "Enter your email address");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("OTP Sent", "Check your email for the reset code.");
      setShowOtpInput(true);
    }
    setLoading(false);
  }

  // UPDATED: Logic to handle OTP verification for both login and signup
  async function handleVerifyOTP() {
    if (!otp) return Alert.alert("Error", "Enter the OTP code");
    setLoading(true);
    
    // Determine the verification type:
    // For login/signup via OTP, Supabase usually expects 'email' or 'signup'
    let verifyType: 'signup' | 'recovery' | 'email' = 'email'; 
    if (authMode === 'signup') verifyType = 'signup';
    if (authMode === 'forgot') verifyType = 'recovery';
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: verifyType,
    });
    if (error) {
      Alert.alert("Verification Failed", error.message);
    } else {
      if (authMode === 'forgot') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) Alert.alert("Error", updateError.message);
        else Alert.alert("Success", "Password updated!");
      } else {
        // For both Login and Signup, if successful, set the session
        if (data.session) setSession(data.session);
        Alert.alert("Success", authMode === 'signup' ? "Account created!" : "Logged in!");
      }
      setShowOtpInput(false);
      setOtp('');
    }
    setLoading(false);
  }

  // 3. FETCH DATA
  const fetchUpdates = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    let query = supabase
      .from('tc_updates')
      .select(`*, stations!inner(name)`) 
      .order('created_at', { ascending: false });
    if (currentStationFilter) {
      query = query.ilike('stations.name', `%${currentStationFilter}%`);
    }
    const { data, error } = await query;
    if (error) console.log('Error fetching:', error.message);
    else setUpdates(data || []);
    setLoading(false);
  };

  // 4. VOTE LOGIC
  const handleVote = async (updateId: string, type: 'up' | 'down') => {
    if (!session?.user?.id) return Alert.alert("Error", "Please login to vote");
    const userId = session.user.id;
    setUpdates(prevUpdates => 
      prevUpdates.map(update => {
        if (update.id === updateId) {
          const currentVote = update.user_vote; 
          let newUp = update.upvotes || 0;
          let newDown = update.downvotes || 0;
          let nextVoteType: string | null = type;
          if (currentVote === type) 
          {
            if (type === 'up') newUp--; else newDown--;
            nextVoteType = null;
          } else if (currentVote && currentVote !== type) {
            if (type === 'up') { newUp++; newDown--; }
            else { newDown++; newUp--; }
          } else {
            if (type === 'up') newUp++; else newDown++;
          }
          return { ...update, upvotes: Math.max(0, newUp), downvotes: Math.max(0, newDown), user_vote: nextVoteType };
        }
        return update;
      })
    );
    const { error } = await supabase.rpc('handle_vote_v2', { 
      target_update_id: updateId, 
      target_user_id: userId, 
      new_vote_type: type 
    });
    if (error) {
      console.log("Vote Error:", error.message);
      fetchUpdates(false);
    }
  };
  // 5. SUBMIT POST
  const handleSubmit = async () => {
    const userId = session?.user?.id;
    if (!userId) return Alert.alert("Error", "Login to post.");
    if (!selectedStationId || tcStatus === null) {
      Alert.alert("Error", "Select station and status!");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('tc_updates')
      .insert([{ 
        station_id: selectedStationId, 
        tc_status: tcStatus, 
        platform_note: note,
        user_id: userId 
      }]);
    setLoading(true);
    if (error) {
        Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "TC Reported!");
      setNote(''); setTcStatus(null); setSelectedStationId('');
      setCurrentTab('view');
      fetchUpdates();
    }
  };
  const handleDelete = async (updateId: string) => {
    Alert.alert("Delete", "Are you sure you want to delete this update?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          setUpdates(prev => prev.filter(u => u.id !== updateId));
          const { error } = await supabase.from('tc_updates').delete().eq('id', updateId);
          if (error) {
            Alert.alert("Database Error", error.message); 
            fetchUpdates(false);
          } else {
            Alert.alert("Success", "Deleted from Database!");
          }
        } 
      }
    ]);
  };
  const findClosestStation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Allow location access to find the nearest station.");
        setLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      let closest: any = null;
      let minDistance = Infinity;
      STATIONS.forEach(station => {
        const dist = Math.sqrt(
          Math.pow((station as any).lat - latitude, 2) + Math.pow((station as any).lon - longitude, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          closest = station;
        }
      });
      if (closest) {
        setSelectedStationId(closest.id);
        Alert.alert("Station Found!", `Looks like you are at ${closest.name}`);
      }
    } catch (error) {
      Alert.alert("Error", "Could not get your location. Make sure GPS is on.");
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUpdates(false);
    setRefreshing(false);
  }, [currentStationFilter]);

  useEffect(() => {
    if (session && currentTab === 'view') fetchUpdates();
  }, [currentTab, session, currentStationFilter]);

  const filteredStations = STATIONS.filter(s => 
    s.name.toLowerCase().includes(stationSearchText.toLowerCase())
  );

  if (!session) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.authContainer}
      >
        <View style={styles.authCard}>
          <Text style={styles.authEmoji}>🎫</Text>
          <Text style={[styles.authTitle, { color: colors.text }]}>TC Tracker</Text>
          <Text style={styles.authSubtitle}>
            {authMode === 'login' ? 'Welcome back, Mumbaikar!' : authMode === 'forgot' ? 'Reset your password' : 'Join the TC Scout Community'}
          </Text>

          <View style={styles.authInputContainer}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
              <TextInput 
                placeholder="Email Address" 
                style={[styles.authInput, { color: colors.text }]} 
                placeholderTextColor={colors.placeholder}        
                value={email} 
                onChangeText={setEmail} 
              />
            </View>

            {showOtpInput && (
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="keypad-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Enter 6-digit OTP" 
                  style={styles.authInput} 
                  value={otp} 
                  onChangeText={setOtp} 
                  keyboardType="number-pad"
                />
              </View>
            )}

            {(authMode !== 'forgot' || showOtpInput) && (
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
                <TextInput 
                  placeholder={authMode === 'forgot' ? "New Password" : "Password"} 
                  style={styles.authInput} 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry={!showPassword}
                  editable={!showOtpInput} 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={scale(22)} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={styles.authSubmitBtn} 
            onPress={() => {
              if (showOtpInput) {
                handleVerifyOTP();
              } else {
                if (authMode === 'login') handleLogin();
                else if (authMode === 'signup') handleSignup();
                else handleSendOTP(); 
              }
            }}
          >
            <Text style={styles.authSubmitBtnText}>
              {showOtpInput ? 'VERIFY CODE' : authMode === 'login' ? 'SEND LOGIN OTP' : authMode === 'signup' ? 'CREATE ACCOUNT' : 'SEND OTP'}
            </Text>
          </TouchableOpacity>

          {authMode === 'login' && (
            <TouchableOpacity 
              style={{marginTop: scale(15)}} 
              onPress={() => { setAuthMode('forgot'); setShowOtpInput(false); }}
            >
              <Text style={{color: '#666', fontWeight: 'bold'}}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.authSwitchBtn} 
            onPress={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setShowOtpInput(false);
            }}
          >
            <Text style={styles.authSwitchText}>
              {authMode === 'login' ? "Don't have an account?  " : "Already have an account?  "}
              <Text style={styles.authSwitchTextBold}>
                {authMode === 'login' ? 'SIGN UP' : 'LOGIN'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* --- HEADER WITH HAMBURGER ICON --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => toggleMenu(true)}>
             <Ionicons name="menu" size={scale(32)} color="black" />
          </TouchableOpacity>
          <View style={styles.pointsBadge}><Text style={styles.pointsText}>⭐ 450 pts</Text></View>
          <Ionicons name="person-circle" size={scale(30)} color="black" />
        </View>

        {/* --- HAMBURGER MENU MODAL --- */}
        {isMenuOpen && (
          <Modal transparent visible={isMenuOpen} animationType="none">
            <View style={styles.menuOverlay}>
              <TouchableOpacity activeOpacity={1} style={styles.overlayTouch} onPress={() => toggleMenu(false)} />
              <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
                <View style={styles.menuInnerHeader}>
                  <Ionicons name="menu" size={scale(24)} color="black" />
                  <Text style={styles.menuTitleText}>MENU</Text>
                  <TouchableOpacity onPress={() => toggleMenu(false)}>
                    <Ionicons name="close" size={scale(28)} color="black" />
                  </TouchableOpacity>
                </View>
                <View style={styles.menuContent}>
                  <TouchableOpacity style={styles.menuBtn} onPress={() => { toggleMenu(false); setShowAbout(true); }}>
                    <MaterialCommunityIcons name="account-search-outline" size={scale(24)} color="black" />
                    <Text style={styles.menuBtnText}>ABOUT US</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.menuBtn} onPress={() => { toggleMenu(false); setShowPolicy(true); }}>
                    <Ionicons name="document-text-outline" size={scale(22)} color="black" />
                    <Text style={styles.menuBtnText}>USER POLICY</Text>
                  </TouchableOpacity>
                 
                  <TouchableOpacity style={styles.menuBtn} onPress={() => { toggleMenu(false); Alert.alert("How to Use", "1. Check 'View Updates' for real-time TC alerts.\n2. Use 'Make Updates' to report TC status at your station.\n3. Vote on others' reports to confirm if they are still accurate."); }}>
                    <MaterialCommunityIcons name="gesture-tap" size={scale(24)} color="black" />
                    <Text style={styles.menuBtnText}>HOW TO USE</Text>
                  </TouchableOpacity>
                 
                  <View style={{ height: 1.5, backgroundColor: '#000000ff', marginTop: scale(1), marginBottom: scale(1)}} />
                  <TouchableOpacity 
                    style={[styles.menuBtn, styles.logoutBtnBorder]} 
                    onPress={() => { 
                      Alert.alert(
                        "Logout Confirmation", 
                        "Are you sure you want to logout?", 
                        [
                          { text: "Cancel", onPress: () => console.log("Logout cancelled"), style: "cancel" },
                          { text: "Logout", style: "destructive", onPress: async () => {
                              toggleMenu(false);
                              const { error } = await supabase.auth.signOut();
                              if (error) {
                                Alert.alert("Error", error.message);
                              } else {
                                setSession(null);
                                setEmail('');
                                setPassword('');
                                setOtp('');
                                setShowOtpInput(false);
                                setCurrentTab('view');
                              }
                            } 
                          }
                        ]
                      );
                    }}
                  >
                    <MaterialCommunityIcons name="logout" size={scale(22)} color="red" />
                    <Text style={[styles.menuBtnText, {color: 'red'}]}>LOGOUT</Text>
                  </TouchableOpacity>
          
                  <TouchableOpacity 
                    style={[styles.menuBtn, { borderColor: colors.border, backgroundColor: colors.card }]} 
                    onPress={() => setIsDarkMode(!isDarkMode)}
                  >
                    <Ionicons name={isDarkMode ? "sunny" : "moon"} size={scale(22)} color={colors.text} />
                    <Text style={[styles.menuBtnText, {color: colors.text}]}>
                      {isDarkMode ? "LIGHT MODE" : "DARK MODE"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Modal>
        )}

        {/* --- SUB-MODALS FOR POLICY & ABOUT --- */}
        <Modal visible={showPolicy || showAbout} animationType="slide">
            <SafeAreaView style={{flex: 1, padding: scale(20)}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(20)}}>
                   <Text style={styles.authTitle}>{showPolicy ? "User Policy" : "About Us"}</Text>
                   <TouchableOpacity onPress={() => { setShowPolicy(false); setShowAbout(false); }}>
                      <Ionicons name="close" size={scale(30)} color="black" />
                   </TouchableOpacity>
                </View>
                <ScrollView>
                    <Text style={{fontSize: moderateScale(16), lineHeight: scale(24)}}>
                        {showPolicy ? "1. Reports must be accurate and real-time.\n2. Spamming or false reporting will result in point deduction.\n3. Community help is a mutual trust system." : "TC Tracker is built for Mumbai local commuters to help each other navigate safely and stay updated on ticket checking status."}
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </Modal>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, currentTab === 'make' && styles.activeTab, styles.leftTab]} onPress={() => setCurrentTab('make')}>
            <Text style={[styles.tabText, currentTab === 'make' && {color: '#fff'}]}>Make Updates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, currentTab === 'view' && styles.activeTab, styles.rightTab]} onPress={() => setCurrentTab('view')}>
            <Text style={[styles.tabText, currentTab === 'view' && {color: '#fff'}]}>View Updates</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {currentTab === 'view' ? (
            <View style={{ flex: 1 }}>
              <View style={styles.inlineSearchContainer}>
                <Ionicons name="search" size={scale(20)} color="#888" style={{marginLeft: scale(10)}} />
                <TextInput style={styles.inlineSearchInput} placeholder="Search station (e.g. Dadar)" value={currentStationFilter} onChangeText={setCurrentStationFilter} placeholderTextColor="#999" />
                {currentStationFilter.length > 0 && (
                  <TouchableOpacity onPress={() => setCurrentStationFilter('')}>
                    <Ionicons name="close-circle" size={scale(20)} color="#888" style={{marginRight: scale(10)}} />
                  </TouchableOpacity>
                )}
              </View>
       
              <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
                {!loading && updates.length > 0 && (
                  <View style={styles.columnLabelsRow}>
                    <View style={styles.labelColLeft}><Text style={styles.columnHeaderText}>Station</Text></View>
                    <View style={styles.labelColMiddle}><Text style={styles.columnHeaderText}>View/Update Votes</Text></View>
                    <View style={styles.labelColRight}><Text style={styles.columnHeaderText}>Posted at</Text></View>
                  </View>
                )}
                {loading && !refreshing ? (
                  <ActivityIndicator size="large" color="#000" style={{ marginTop: scale(20) }} />
                ) : (
                  updates.length > 0 ? (
                    updates.map((item) => (
                        <View key={item.id} style={styles.updateCard}>
                          <View style={styles.cardHeader}>
                            <View style={{ flex: 2 }}><Text style={styles.stationBadgeText}>{item.stations?.name}</Text></View>
                            <View style={styles.votesWrapper}>
                              <View style={styles.inlineVoteRow}>
                                <TouchableOpacity style={styles.voteBtnTiny} onPress={() => handleVote(item.id, 'up')}>
                                  <Ionicons name="arrow-up" size={scale(18)} color="#4CAF50" />
                                  <Text style={styles.voteBtnText}>{item.upvotes || 0}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.voteBtnTiny} onPress={() => handleVote(item.id, 'down')}>
                                  <Ionicons name="arrow-down" size={scale(18)} color="#ff4d4d" />
                                  <Text style={styles.voteBtnText}>{item.downvotes || 0}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View style={styles.topTimeSection}>
                               <Text style={styles.timeTextBold}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[styles.statusText, { color: item.tc_status ? '#ff4d4d' : '#4CAF50' }]}>TC {item.tc_status ? 'Available' : 'Not Seen'}</Text>
                            {item.user_id === session?.user?.id && (
                              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                                <Ionicons name="trash-outline" size={scale(18)} color="#ff4d4d" />
                              </TouchableOpacity>
                            )}
                          </View>
                          {item.platform_note && <Text style={styles.noteText} numberOfLines={2} ellipsizeMode="tail">Note: {item.platform_note}</Text>}
                        </View>
                    ))
                  ) : (
                    <Text style={{textAlign: 'center', marginTop: scale(40), color: '#888', fontSize: moderateScale(14)}}>No updates found for this station.</Text>
                  )
                )}
              </ScrollView>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Select Station</Text>
              <View style={{ flexDirection: 'row', gap: scale(10), alignItems: 'center' }}>
                <TouchableOpacity style={[styles.searchSelectTrigger, { flex: 1, marginTop: 0 }]} onPress={() => setIsModalVisible(true)}>
                    <Text style={selectedStationId ? styles.selectedText : styles.placeholderText}>
                        {selectedStationId ? (STATIONS as any[]).find(s => s.id === selectedStationId)?.name : "Choose a station..."}
                    </Text>
                    <Ionicons name="chevron-down" size={scale(20)} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { marginTop: 0, padding: scale(15), width: scale(55), borderRadius: scale(12) }]} onPress={findClosestStation}>
                   <Ionicons name="location" size={scale(24)} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>TC Status</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.statusBtn, tcStatus === true && styles.dangerBtn]} onPress={() => setTcStatus(true)}>
                  <Text style={[{ fontSize: moderateScale(14) }, tcStatus === true && {color:'#fff'}]}>TC Available</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.statusBtn, tcStatus === false && styles.successBtn]} onPress={() => setTcStatus(false)}>
                  <Text style={[{ fontSize: moderateScale(14) }, tcStatus === false && {color:'#fff'}]}>TC Not Seen</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Add Note (Optional)</Text>
              <TextInput style={styles.input} placeholder="Add Bridge No./Platform No./etc for better Info.." value={note} onChangeText={setNote} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>{loading ? 'Posting...' : 'POST UPDATE'}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        <Modal visible={isModalVisible} animationType="slide">
            <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
                <View style={styles.modalHeader}>
                    <View style={styles.modalSearchSection}>
                        <Ionicons name="search" size={scale(20)} color="#888" style={{marginLeft: scale(10)}} />
                        <TextInput style={styles.modalSearchInput} placeholder="Type station name..." value={stationSearchText} onChangeText={setStationSearchText} autoFocus={true} />
                    </View>
                    <TouchableOpacity onPress={() => { setIsModalVisible(false); setStationSearchText(''); }}>
                        <Text style={styles.closeBtn}>Cancel</Text>
                    </TouchableOpacity>
                </View>
                <FlatList data={filteredStations} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.stationItem} onPress={() => { setSelectedStationId(item.id); setIsModalVisible(false); setStationSearchText(''); }}>
                        <Text style={styles.stationItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )} />
            </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
    // ADD THESE TWO LINES BELOW:
    maxWidth: 500, 
    alignSelf: 'center', 
    width: '100%' 
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: scale(20), alignItems: 'center', paddingTop: Platform.OS === 'android' ? scale(40) : scale(20) },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayTouch: { position: 'absolute', width: width, height: height },
  menuContainer: {
    width: width * 0.7, 
    height: 'auto',
    backgroundColor: 'white',
    borderTopRightRadius: scale(25),
    borderBottomRightRadius: scale(25),
    padding: scale(15),
    paddingTop: Platform.OS === 'ios' ? scale(25) : scale(15),
    marginTop: scale(30),
    borderWidth: 2,
    borderColor: 'black',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  menuInnerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(5), marginBottom: scale(15), borderBottomWidth: 1, borderBottomColor: '#000000ff', paddingBottom: scale(5) },
  menuTitleText: { fontSize: moderateScale(22), fontWeight: '900', letterSpacing: 1.5 },
  menuContent: { gap: scale(15) },
  menuBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(12), borderWidth: 2, borderColor: 'black', borderRadius: scale(30), paddingVertical: scale(10), paddingHorizontal: scale(20), backgroundColor: 'white' },
  menuBtnText: { fontSize: moderateScale(16), fontWeight: '900', color: 'black', textAlign: 'center' },
  logoutBtnBorder: { borderColor: 'red' },
  inlineSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: scale(12), paddingHorizontal: scale(5), marginBottom: scale(15), height: scale(50), borderWidth: 1.5, borderColor: '#000' },
  inlineSearchInput: { flex: 1, height: '100%', paddingHorizontal: scale(10), fontSize: moderateScale(16), color: '#000', fontWeight: '500' },
  pointsBadge: { borderWidth: 1.5, borderRadius: scale(20), paddingHorizontal: scale(15), paddingVertical: scale(5) },
  pointsText: { fontWeight: 'bold', fontSize: moderateScale(14) },
  tabContainer: { flexDirection: 'row', paddingHorizontal: scale(20), marginVertical: scale(10) },
  tab: { flex: 1, padding: scale(12), alignItems: 'center', borderWidth: 1.5 },
  leftTab: { borderTopLeftRadius: scale(12), borderBottomLeftRadius: scale(12) },
  rightTab: { borderTopRightRadius: scale(12), borderBottomRightRadius: scale(12) },
  activeTab: { backgroundColor: '#000' },
  tabText: { fontWeight: 'bold', fontSize: moderateScale(14) },
  content: { flex: 1, paddingHorizontal: scale(20) },
  columnLabelsRow: { flexDirection: 'row', paddingHorizontal: scale(5), marginBottom: scale(10) },
  labelColLeft: { flex: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: scale(8), height: scale(30), backgroundColor: '#fff', marginRight: scale(5) },
  labelColMiddle: { flex: 2.5, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: scale(8), height: scale(30), backgroundColor: '#fff' },
  labelColRight: { flex: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: scale(8), height: scale(30), backgroundColor: '#fff', marginLeft: scale(5) },
  columnHeaderText: { fontSize: moderateScale(10), fontWeight: '900', textTransform: 'uppercase', color: '#000' },
  updateCard: { borderWidth: 1.5, borderRadius: scale(15), padding: scale(12), marginBottom: scale(15) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(8) },
  votesWrapper: { alignItems: 'center', flex: 3 },
  inlineVoteRow: { flexDirection: 'row', gap: scale(6) },
  voteBtnTiny: { flexDirection: 'row', backgroundColor: '#f5f5f5', paddingHorizontal: scale(8), paddingVertical: scale(4), borderWidth: 1, borderRadius: scale(6), alignItems: 'center' },
  voteBtnText: { fontWeight: 'bold', fontSize: moderateScale(12), marginLeft: scale(2) },
  topTimeSection: { alignItems: 'flex-end', flex: 2 },
  timeTextBold: { fontWeight: 'bold', fontSize: moderateScale(15) },
  stationBadgeText: { fontWeight: 'bold', fontSize: moderateScale(16) },
  statusText: { fontSize: moderateScale(18), fontWeight: 'bold' },
  noteText: { marginTop: scale(8), color: '#444', fontStyle: 'italic', fontSize: moderateScale(13) },
  label: { fontWeight: 'bold', marginTop: scale(20), marginBottom: scale(5), fontSize: moderateScale(14) },
  input: { borderWidth: 1.5, borderRadius: scale(12), padding: scale(15), marginTop: scale(10), fontSize: moderateScale(14) },
  row: { flexDirection: 'row', gap: scale(10), marginTop: scale(5) },
  statusBtn: { flex: 1, padding: scale(15), borderRadius: scale(12), borderWidth: 1.5, alignItems: 'center' },
  dangerBtn: { backgroundColor: '#ff4d4d', borderColor: '#ff4d4d' },
  successBtn: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  submitBtn: { backgroundColor: '#000', padding: scale(18), borderRadius: scale(12), marginTop: scale(20), alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: moderateScale(16) },
  searchSelectTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderRadius: scale(12), padding: scale(15), marginTop: scale(5) },
  placeholderText: { color: '#888', fontSize: moderateScale(14) },
  selectedText: { color: '#000', fontWeight: 'bold', fontSize: moderateScale(14) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: scale(15), borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: Platform.OS === 'android' ? scale(40) : scale(15) },
  modalSearchSection: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: scale(10), borderWidth: 1, borderColor: '#ddd' },
  modalSearchInput: { flex: 1, height: scale(45), paddingHorizontal: scale(10), fontSize: moderateScale(16) },
  closeBtn: { marginLeft: scale(15), color: '#4CAF50', fontWeight: 'bold', fontSize: moderateScale(16) },
  stationItem: { padding: scale(18), borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stationItemText: { fontSize: moderateScale(17) },
  deleteBtn: { padding: scale(4), borderRadius: scale(6), borderWidth: 1, borderColor: '#ff4d4d' },
  authContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: scale(30) },
  authCard: { alignItems: 'center', width: '100%' },
  authEmoji: { fontSize: moderateScale(50), marginBottom: scale(10) },
  authTitle: { fontSize: moderateScale(32), fontWeight: 'bold', color: '#000' },
  authSubtitle: { fontSize: moderateScale(14), color: '#666', marginBottom: scale(40), textAlign: 'center' },
  authInputContainer: { width: '100%', gap: scale(15), marginBottom: scale(25) },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#000', borderRadius: scale(12), paddingHorizontal: scale(15), height: scale(55), backgroundColor: '#fff' },
  inputIcon: { marginRight: scale(10) },
  authInput: { flex: 1, height: '100%', fontSize: moderateScale(16), color: '#000' },
  authSubmitBtn: { backgroundColor: '#000', width: '100%', height: scale(55), borderRadius: scale(12), justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  authSubmitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: moderateScale(16), letterSpacing: 1 },
  authSwitchBtn: { marginTop: scale(25), paddingVertical: scale(15), paddingHorizontal: scale(20), borderRadius: scale(12), borderWidth: 1.5, borderColor: '#000000ff', width: '100%', alignItems: 'center', backgroundColor: '#fafafa' },
  authSwitchTextBold: { color: '#000', fontWeight: 'bold', textDecorationLine: 'underline' },
  authSwitchText: { color: '#666', fontWeight: '600', fontSize: moderateScale(14) },
});