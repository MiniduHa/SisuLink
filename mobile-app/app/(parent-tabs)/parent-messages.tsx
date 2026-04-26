import React, { useState, useRef, useEffect } from "react"; 
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Linking,
  BackHandler 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router"; 
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get("window");

type Attachment = { uri: string, type: 'image' | 'document', name: string };

type ChatMessage = {
  id: number;
  text: string;
  sender: string;
  time: string;
  attachment?: Attachment | null;
};

export default function ParentMessagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userEmail = (params.email as string) || "";
  const userName = (params.full_name as string) || "Parent";
  
  // --- INBOX STATES ---
  const [messages, setMessages] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("All"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);

  // --- ACTIVE CHAT STATES ---
  const [activeChat, setActiveChat] = useState<{name: string, role: string, type: string, email: string} | null>(null);
  const [messageText, setMessageText] = useState("");
  const [attachedFile, setAttachedFile] = useState<Attachment | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [isAttachMenuVisible, setAttachMenuVisible] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch Conversations
  const fetchConversations = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/messages/Parent/${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Fetch Messages Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Available Contacts (Teachers)
  const fetchContacts = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/parent/${userEmail}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setAvailableContacts(data);
      }
    } catch (error) {
      console.error("Fetch Contacts Error:", error);
    }
  };

  // Fetch Chat History
  const fetchChatHistory = async (otherEmail: string) => {
    if (!userEmail || !otherEmail) return;
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/messages/Parent/${userEmail}/history/${otherEmail}`);
      if (response.ok) {
        const data = await response.json();
        const formatted = data.map((m: any) => ({
          id: m.id,
          text: m.content,
          sender: m.sender_email === userEmail ? "me" : "other",
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachment: null 
        }));
        setChatHistory(formatted);
        
        const unreadMsg = data.find((m: any) => !m.is_read && m.receiver_email === userEmail);
        if (unreadMsg) {
          fetch(`http://172.20.10.7:5000/api/messages/read/${unreadMsg.id}`, { method: 'PUT' });
        }
      }
    } catch (error) {
      console.error("Fetch History Error:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchContacts();
    
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [userEmail]);

  // --- SMART HARDWARE BACK BUTTON INTERCEPTION ---
  useEffect(() => {
    const backAction = () => {
      if (viewingImage) { setViewingImage(null); return true; }
      if (activeChat) { handleCloseChat(); return true; }
      return false; 
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [activeChat, viewingImage]);


  // --- ACTIONS ---
  // FIXED: Changed signature to safely accept a single object!
  const handleOpenChat = (contact: any) => {
    setMessages(messages.map(msg => msg.other_email === contact.email ? { ...msg, unread: false } : msg));
    setContactModalVisible(false);
    setActiveChat({ 
      name: contact.name || contact.sender || "Unknown", 
      role: contact.role || contact.other_role || "Staff", 
      type: contact.type || contact.other_role?.toLowerCase() || "teacher", 
      email: contact.email || contact.other_email 
    });
    fetchChatHistory(contact.email || contact.other_email);
  };

  const handleCloseChat = () => {
    setActiveChat(null);
    setMessageText("");
    setChatHistory([]);
    setAttachedFile(null);
    setAttachMenuVisible(false);
    fetchConversations(); 
  };

  const toggleAttachMenu = () => {
    setAttachMenuVisible(!isAttachMenuVisible);
  };

  const takePhoto = async () => {
    setAttachMenuVisible(false);
    const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
    
    if (status !== 'granted') {
      if (canAskAgain) {
        const newPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (newPermission.status !== 'granted') return;
      } else {
        return Alert.alert(
          "Camera Permission Denied", 
          "Please enable camera access in your device settings to take a photo.",
          [ { text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() } ]
        );
      }
    }
    
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setAttachedFile({ uri: result.assets[0].uri, type: 'image', name: 'photo.jpg' });
  };

  const pickImage = async () => {
    setAttachMenuVisible(false);
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      if (canAskAgain) {
        const newPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newPermission.status !== 'granted') return;
      } else {
        return Alert.alert(
          "Gallery Access Required", 
          "You have previously denied gallery access. Please enable it in your device settings to choose a photo.",
          [ { text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() } ]
        );
      }
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!result.canceled) setAttachedFile({ uri: result.assets[0].uri, type: 'image', name: 'image.jpg' });
  };

  const pickDocument = async () => {
    setAttachMenuVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled) setAttachedFile({ uri: result.assets[0].uri, type: 'document', name: result.assets[0].name });
    } catch (error) {
      console.log("Document picker error: ", error);
    }
  };

  const handleSendMessage = async () => {
    if ((messageText.trim() === "" && !attachedFile) || !activeChat) return;
    
    const payload = {
      sender_email: userEmail,
      sender_role: "Parent",
      sender_name: userName,
      receiver_email: activeChat.email,
      receiver_role: activeChat.type === 'teacher' ? 'Teacher' : 'SchoolAdmin',
      content: messageText
    };

    try {
      const response = await fetch(`http://172.20.10.7:5000/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newMsgFromDb = await response.json();
        const newMsg: ChatMessage = {
          id: newMsgFromDb.id,
          text: messageText,
          sender: "me",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachment: attachedFile
        };
        setChatHistory(prev => [...prev, newMsg]);
        setMessageText("");
        setAttachedFile(null);
        setAttachMenuVisible(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please check your connection.");
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesFilter = activeFilter === "All" || (activeFilter === "Unread" && msg.unread);
    const nameMatch = (msg.sender || "").toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (msg.other_email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const snippetMatch = (msg.snippet || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && (nameMatch || emailMatch || snippetMatch);
  });

  const currentChatLog = chatHistory;

  // FIXED: Perfectly matched the bottom bar from parent-screen.tsx
  const renderBottomTabBar = () => (
    <View style={styles.bottomTabBar}>
      {[ 
        { icon: "home", label: "Home", route: "/(parent-tabs)/parent-screen" }, 
        { icon: "message-square", label: "Messages", route: "/(parent-tabs)/parent-messages" }, 
        { icon: "calendar", label: "Calendar", route: "/(auth)/calendar" }, 
        { icon: "info", label: "About Us", route: "/(auth)/about-us" } 
      ].map((tab: any, index: number) => {
        const isActive = index === 1; // "Messages" is active
        return (
          <TouchableOpacity 
            key={index} 
            style={styles.tabItem}
            onPress={() => {
              if (tab.route && !isActive) {
                router.navigate({ pathname: tab.route as any, params: params as any });
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name={tab.icon as any} size={20} color={isActive ? "#2563EB" : "#64748B"} />
            <Text style={[styles.tabLabel, { color: isActive ? "#2563EB" : "#64748B" }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );


  // ==========================================
  // VIEW 1: ACTIVE CHAT SCREEN
  // ==========================================
  if (activeChat) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleCloseChat} style={styles.backBtn}>
              <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.chatContactName}>{activeChat.name}</Text>
              <Text style={styles.chatContactRole}>{activeChat.role}</Text>
            </View>
            {activeChat.type === "teacher" && (
              <TouchableOpacity style={styles.phoneBtn}>
                <Feather name="phone" size={20} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            contentContainerStyle={styles.chatContainer} 
            showsVerticalScrollIndicator={false}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            onScrollBeginDrag={() => setAttachMenuVisible(false)}
          >
            <Text style={styles.chatDateDivider}>Recent</Text>
            
            {currentChatLog.length === 0 && (
              <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
            )}

            {currentChatLog.map((msg) => {
              const isMe = msg.sender === "me";
              return (
                <View key={msg.id} style={[styles.messageBubbleWrapper, isMe ? styles.alignRight : styles.alignLeft]}>
                  <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    
                    {msg.attachment && (
                      <View style={styles.chatAttachmentContainer}>
                        {msg.attachment.type === 'image' ? (
                          <TouchableOpacity onPress={() => setViewingImage(msg.attachment!.uri)} activeOpacity={0.9}>
                            <Image source={{ uri: msg.attachment.uri }} style={styles.chatImage} />
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.chatDocument, isMe ? styles.myChatDocument : styles.otherChatDocument]}>
                            <Feather name="file-text" size={20} color={isMe ? "#2563EB" : "#64748B"} />
                            <Text style={[styles.chatDocText, isMe ? { color: "#2563EB" } : { color: "#1E293B" }]} numberOfLines={1}>{msg.attachment.name}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {msg.text.length > 0 && (
                      <Text style={[styles.chatMessageText, isMe ? styles.myText : styles.otherText, msg.attachment ? { marginTop: 8 } : {}]}>
                        {msg.text}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.chatTimeLabel}>{msg.time}</Text>
                </View>
              );
            })}
          </ScrollView>

          {activeChat.type === "teacher" ? (
            <View style={styles.composerWrapper}>
              
              {attachedFile && (
                <View style={styles.attachmentPreviewArea}>
                  <View style={styles.attachmentPreviewCard}>
                    {attachedFile.type === 'image' ? (
                      <Image source={{ uri: attachedFile.uri }} style={styles.previewImage} />
                    ) : (
                      <View style={styles.previewDocument}>
                        <Feather name="file" size={24} color="#64748B" />
                        <Text style={styles.previewDocText} numberOfLines={1}>{attachedFile.name}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeAttachmentBtn} onPress={() => setAttachedFile(null)}>
                      <Feather name="x" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isAttachMenuVisible && (
                <View style={styles.attachMenuContainer}>
                  <TouchableOpacity style={styles.attachMenuItem} onPress={pickImage}>
                    <View style={[styles.attachIconBg, { backgroundColor: '#DBEAFE' }]}>
                      <Feather name="image" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.attachMenuText}>Photo Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.attachMenuItem} onPress={takePhoto}>
                    <View style={[styles.attachIconBg, { backgroundColor: '#FCE7F3' }]}>
                      <Feather name="camera" size={18} color="#E11D48" />
                    </View>
                    <Text style={styles.attachMenuText}>Camera</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.attachMenuItem} onPress={pickDocument}>
                    <View style={[styles.attachIconBg, { backgroundColor: '#FEF3C7' }]}>
                      <Feather name="file-text" size={18} color="#D97706" />
                    </View>
                    <Text style={styles.attachMenuText}>Document</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachBtn} onPress={toggleAttachMenu}>
                  <Feather name="paperclip" size={22} color={isAttachMenuVisible ? "#2563EB" : "#64748B"} />
                </TouchableOpacity>
                <TextInput 
                  style={styles.chatTextInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  value={messageText}
                  onChangeText={setMessageText}
                  onFocus={() => setAttachMenuVisible(false)}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, (messageText.trim() === "" && !attachedFile) ? { backgroundColor: "#E2E8F0" } : { backgroundColor: "#2563EB" }]}
                  onPress={handleSendMessage}
                  disabled={messageText.trim() === "" && !attachedFile}
                >
                  <Feather name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.readOnlyContainer}>
              <Feather name="info" size={16} color="#64748B" />
              <Text style={styles.readOnlyText}>Replies are disabled for school announcements.</Text>
            </View>
          )}

        </KeyboardAvoidingView>

        <Modal visible={viewingImage !== null} transparent={true} animationType="fade">
          <View style={styles.imageViewerBackground}>
            <TouchableOpacity style={styles.closeImageViewerBtn} onPress={() => setViewingImage(null)}>
              <Feather name="x" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {viewingImage && (
              <Image source={{ uri: viewingImage }} style={styles.fullScreenImage} />
            )}
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  // ==========================================
  // VIEW 2: INBOX DASHBOARD (Default)
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ flex: 1 }}>
        
        <View style={styles.inboxHeader}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search messages or senders..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity style={[styles.filterTab, activeFilter === "All" && styles.activeFilterTab]} onPress={() => setActiveFilter("All")}>
            <Text style={[styles.filterText, activeFilter === "All" && styles.activeFilterText]}>All Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterTab, activeFilter === "Unread" && styles.activeFilterTab]} onPress={() => setActiveFilter("Unread")}>
            <Text style={[styles.filterText, activeFilter === "Unread" && styles.activeFilterText]}>Unread</Text>
            {messages.some(m => m.unread) && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{messages.filter(m => m.unread).length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inboxScrollContent}>
          {filteredMessages.length > 0 ? (
            filteredMessages.map((msg) => (
              <TouchableOpacity 
                key={msg.id} 
                style={[styles.messageCard, msg.unread && styles.messageCardUnread]} 
                // FIXED: Passing a safe, single object here!
                onPress={() => handleOpenChat({ name: msg.sender, role: msg.role, type: msg.type, email: msg.other_email })}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarBg, msg.type === 'admin' ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#DBEAFE' }]}>
                  {msg.type === 'admin' ? (
                    <FontAwesome6 name="bullhorn" size={18} color="#D97706" />
                  ) : (
                    <FontAwesome6 name="chalkboard-user" size={18} color="#2563EB" />
                  )}
                </View>
                <View style={styles.messageInfo}>
                  <View style={styles.messageHeaderRow}>
                    <Text style={[styles.senderName, msg.unread && styles.senderNameUnread]} numberOfLines={1}>{msg.sender}</Text>
                    <Text style={[styles.timeText, msg.unread && styles.timeTextUnread]}>{msg.time}</Text>
                  </View>
                  <Text style={styles.roleText}>{msg.role}</Text>
                  <View style={styles.snippetRow}>
                    <Text style={[styles.snippetText, msg.unread && styles.snippetTextUnread, msg.snippet?.includes('📷') || msg.snippet?.includes('📄') ? { color: "#2563EB", fontWeight: "600" } : {}]} numberOfLines={2}>{msg.snippet}</Text>
                    {msg.unread && <View style={styles.unreadDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No Messages</Text>
              <Text style={styles.emptyStateSub}>You're all caught up!</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => setContactModalVisible(true)}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {renderBottomTabBar()}

        {/* CONTACTS MODAL */}
        <Modal visible={isContactModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Message</Text>
                <TouchableOpacity onPress={() => setContactModalVisible(false)} style={styles.closeBtn}>
                  <Feather name="x" size={24} color="#1E293B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Select a teacher to start chatting</Text>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {availableContacts.map(contact => (
                  <TouchableOpacity 
                    key={contact.id} 
                    style={styles.contactRow}
                    // FIXED: Passing a safe, single object here!
                    onPress={() => handleOpenChat({ name: contact.name, role: contact.role, type: contact.type, email: contact.email })}
                  >
                    <View style={[styles.avatarBg, { backgroundColor: '#DBEAFE' }]}>
                      <FontAwesome6 name="chalkboard-user" size={16} color="#2563EB" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactRole}>{contact.role}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  
  inboxHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, backgroundColor: "#FFFFFF" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1E293B" },
  searchContainer: { backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingBottom: 15 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 15, height: 45 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B" },
  filterContainer: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  filterTab: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, backgroundColor: "#F1F5F9" },
  activeFilterTab: { backgroundColor: "#2563EB" },
  filterText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  activeFilterText: { color: "#FFFFFF" },
  unreadBadge: { backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  unreadBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  
  inboxScrollContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 100 },
  messageCard: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, borderLeftWidth: 4, borderLeftColor: "transparent" },
  messageCardUnread: { backgroundColor: "#F8FAFC", borderLeftColor: "#2563EB" },
  avatarBg: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", marginRight: 15 },
  messageInfo: { flex: 1 },
  messageHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  senderName: { fontSize: 15, fontWeight: "600", color: "#1E293B", flex: 1, marginRight: 10 },
  senderNameUnread: { fontWeight: "bold" },
  roleText: { fontSize: 12, color: "#64748B", marginTop: 2, marginBottom: 6 },
  timeText: { fontSize: 11, color: "#9CA3AF" },
  timeTextUnread: { color: "#2563EB", fontWeight: "600" },
  snippetRow: { flexDirection: "row", alignItems: "flex-end" },
  snippetText: { flex: 1, fontSize: 13, color: "#64748B", lineHeight: 18 },
  snippetTextUnread: { color: "#1E293B", fontWeight: "500" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563EB", marginLeft: 10, marginBottom: 4 },
  
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 80 },
  emptyStateTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginTop: 15 },
  emptyStateSub: { fontSize: 14, color: "#64748B", marginTop: 5 },
  fab: { position: "absolute", bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center", shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  
  bottomTabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0", position: "absolute", bottom: 0, left: 0, right: 0 },
  tabItem: { alignItems: "center", flex: 1 },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: "50%", paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1E293B" },
  closeBtn: { padding: 5 },
  modalSubtitle: { fontSize: 14, color: "#64748B", marginBottom: 20 },
  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  contactRole: { fontSize: 13, color: "#64748B", marginTop: 2 },

  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12, marginRight: 15 },
  headerInfo: { flex: 1 },
  chatContactName: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  chatContactRole: { fontSize: 13, color: "#64748B", marginTop: 2 },
  phoneBtn: { padding: 8, backgroundColor: "#EFF6FF", borderRadius: 12 },
  
  chatContainer: { padding: 20, paddingBottom: 20 },
  chatDateDivider: { alignSelf: "center", fontSize: 12, fontWeight: "bold", color: "#9CA3AF", marginBottom: 20, backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  emptyChatText: { textAlign: "center", color: "#9CA3AF", marginTop: 20, fontStyle: "italic" },
  
  messageBubbleWrapper: { marginBottom: 15, maxWidth: "80%" },
  alignRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  alignLeft: { alignSelf: "flex-start", alignItems: "flex-start" },
  messageBubble: { padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: "#2563EB", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E2E8F0" },
  chatMessageText: { fontSize: 15, lineHeight: 22 },
  myText: { color: "#FFFFFF" },
  otherText: { color: "#1E293B" },
  chatTimeLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 4, marginHorizontal: 4 },

  composerWrapper: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0", zIndex: 10 },
  
  attachMenuContainer: { position: "absolute", bottom: 75, left: 15, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 8, width: 220, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10, zIndex: 20 },
  attachMenuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  attachIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  attachMenuText: { fontSize: 15, fontWeight: "600", color: "#1E293B" },

  attachmentPreviewArea: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 5 },
  attachmentPreviewCard: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  previewImage: { width: 60, height: 60, borderRadius: 8 },
  previewDocument: { flexDirection: "row", alignItems: "center", width: 120, height: 50, paddingHorizontal: 10 },
  previewDocText: { fontSize: 12, color: "#475569", marginLeft: 8, flex: 1 },
  removeAttachmentBtn: { position: "absolute", top: -8, right: -8, backgroundColor: "#EF4444", width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFFFFF", zIndex: 5 },
  
  chatAttachmentContainer: { marginBottom: 5, overflow: "hidden", borderRadius: 12 },
  chatImage: { width: 220, height: 160, borderRadius: 12, resizeMode: "cover" },
  chatDocument: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12 },
  myChatDocument: { backgroundColor: "#EFF6FF" },
  otherChatDocument: { backgroundColor: "#F1F5F9" },
  chatDocText: { fontSize: 14, fontWeight: "600", marginLeft: 8, maxWidth: 150 },

  inputContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10 },
  attachBtn: { padding: 10 },
  chatTextInput: { flex: 1, backgroundColor: "#F1F5F9", borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: "#1E293B", maxHeight: 100, marginHorizontal: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },

  readOnlyContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", paddingVertical: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  readOnlyText: { color: "#64748B", fontSize: 13, marginLeft: 8, fontWeight: "500" },

  imageViewerBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  closeImageViewerBtn: { position: "absolute", top: 60, right: 20, zIndex: 10, padding: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 25 },
  fullScreenImage: { width: "100%", height: "80%", resizeMode: "contain" },
});