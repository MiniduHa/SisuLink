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

export default function TeacherMessagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userEmail = (params.email as string) || "";
  const userName = (params.full_name as string) || "Teacher";
  
  // --- INBOX STATES ---
  const [messages, setMessages] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("All"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [contactFilter, setContactFilter] = useState("All"); 
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
      const response = await fetch(`http://172.20.10.7:5000/api/messages/Teacher/${userEmail}`);
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

  // Fetch Available Contacts (Parents and Students)
  const fetchContacts = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/${userEmail}/contacts`);
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
      const response = await fetch(`http://172.20.10.7:5000/api/messages/Teacher/${userEmail}/history/${otherEmail}`);
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

  useEffect(() => {
    const backAction = () => {
      if (viewingImage) { setViewingImage(null); return true; }
      if (activeChat) { handleCloseChat(); return true; }
      return false; 
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [activeChat, viewingImage]);


  const handleOpenChat = (contact: any) => {
    setMessages(messages.map(msg => msg.other_email === contact.email ? { ...msg, unread: false } : msg));
    setContactModalVisible(false);
    setActiveChat({ 
      name: contact.name || contact.sender || "Unknown", 
      role: contact.role || contact.other_role || "User", 
      type: contact.type || contact.other_role?.toLowerCase() || "student", 
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

  const handleSendMessage = async () => {
    if ((messageText.trim() === "" && !attachedFile) || !activeChat) return;
    
    const payload = {
      sender_email: userEmail,
      sender_role: "Teacher",
      sender_name: userName,
      receiver_email: activeChat.email,
      receiver_role: activeChat.type === 'parent' ? 'Parent' : (activeChat.type === 'admin' ? 'SchoolAdmin' : 'Student'),
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

  const renderBottomTabBar = () => (
    <View style={styles.bottomTabBar}>
      {[ 
        { icon: "home", label: "Home", route: "/(teacher-tabs)/teacher-screen" }, 
        { icon: "message-square", label: "Messages", route: "/(teacher-tabs)/teacher-messages" }, 
        { icon: "folder", label: "Materials", route: "/(teacher-tabs)/teacher-materials" },
        { icon: "users", label: "Classes", route: null }, 
        { icon: "calendar", label: "Calendar", route: "/(auth)/calendar" }, 
        { icon: "info", label: "About Us", route: "/(auth)/about-us" } 
      ].map((tab, index) => {
        const isActive = index === 1; 
        return (
          <TouchableOpacity 
            key={index} 
            style={styles.tabItem} 
            onPress={() => { 
              if (tab.route && !isActive) {
                router.push({
                  pathname: tab.route as any,
                  params: params 
                });
              }
            }}
          >
            <Feather name={tab.icon as any} size={20} color={isActive ? "#2563EB" : "#64748B"} />
            <Text style={[styles.tabLabel, { color: isActive ? "#2563EB" : "#64748B" }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

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
          </View>

          <ScrollView 
            contentContainerStyle={styles.chatContainer} 
            showsVerticalScrollIndicator={false}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {chatHistory.map((msg) => (
              <View key={msg.id} style={[styles.messageBubbleWrapper, msg.sender === "me" ? styles.alignRight : styles.alignLeft]}>
                <View style={[styles.messageBubble, msg.sender === "me" ? styles.myBubble : styles.otherBubble]}>
                  <Text style={[styles.chatMessageText, msg.sender === "me" ? styles.myText : styles.otherText]}>{msg.text}</Text>
                </View>
                <Text style={styles.chatTimeLabel}>{msg.time}</Text>
              </View>
            ))}
          </ScrollView>

          {activeChat.type !== "admin" ? (
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.chatTextInput}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                value={messageText}
                onChangeText={setMessageText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, messageText.trim() === "" ? { backgroundColor: "#E2E8F0" } : { backgroundColor: "#2563EB" }]}
                onPress={handleSendMessage}
                disabled={messageText.trim() === ""}
              >
                <Feather name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.readOnlyContainer}>
                <Text style={styles.readOnlyText}>Broadcast only from Admin.</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
              placeholder="Search conversations..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.inboxScrollContent}>
          {filteredMessages.map((msg) => (
            <TouchableOpacity 
              key={msg.id} 
              style={[styles.messageCard, msg.unread && styles.messageCardUnread]} 
              onPress={() => handleOpenChat(msg)}
            >
              <View style={styles.avatarBg}>
                <FontAwesome6 name={msg.other_role === 'Parent' ? "user-group" : "user-graduate"} size={18} color="#2563EB" />
              </View>
              <View style={styles.messageInfo}>
                <View style={styles.messageHeaderRow}>
                  <Text style={styles.senderName}>{msg.sender}</Text>
                  <Text style={styles.timeText}>{msg.time}</Text>
                </View>
                <Text style={styles.roleText}>{msg.other_role}</Text>
                <Text style={styles.snippetText} numberOfLines={1}>{msg.snippet}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.fab} onPress={() => setContactModalVisible(true)}>
          <Feather name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {renderBottomTabBar()}

        <Modal visible={isContactModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Message</Text>
                <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                  <Feather name="x" size={24} color="#1E293B" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalFilterContainer}>
                {["All", "Students", "Parents"].map(f => (
                  <TouchableOpacity 
                    key={f} 
                    style={[styles.modalFilterBtn, contactFilter === f && styles.modalFilterBtnActive]}
                    onPress={() => setContactFilter(f)}
                  >
                    <Text style={[styles.modalFilterText, contactFilter === f && styles.modalFilterTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {availableContacts
                  .filter(c => {
                    if (contactFilter === "All") return true;
                    if (contactFilter === "Students") return c.type === 'student';
                    if (contactFilter === "Parents") return c.type === 'parent';
                    return true;
                  })
                  .map(contact => (
                    <TouchableOpacity key={contact.email} style={styles.contactRow} onPress={() => handleOpenChat(contact)}>
                      <View style={styles.avatarBg}>
                        <FontAwesome6 name={contact.type === 'parent' ? "user-group" : "user-graduate"} size={16} color="#2563EB" />
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
  inboxHeader: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10, backgroundColor: "#FFFFFF" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1E293B" },
  searchContainer: { backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingBottom: 15 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 15, height: 45 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B" },
  inboxScrollContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 100 },
  messageCard: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  messageCardUnread: { backgroundColor: "#F8FAFC", borderLeftWidth: 4, borderLeftColor: "#2563EB" },
  avatarBg: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 15 },
  messageInfo: { flex: 1 },
  messageHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  senderName: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  roleText: { fontSize: 12, color: "#64748B", marginTop: 2, marginBottom: 6 },
  timeText: { fontSize: 11, color: "#9CA3AF" },
  snippetText: { fontSize: 13, color: "#64748B" },
  fab: { position: "absolute", bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center", elevation: 5 },
  bottomTabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0", position: "absolute", bottom: 0, left: 0, right: 0 },
  tabItem: { alignItems: "center", flex: 1 },
  tabLabel: { fontSize: 10, marginTop: 4, color: "#64748B" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "bold" },
  contactRole: { fontSize: 13, color: "#64748B" },
  modalFilterContainer: { flexDirection: "row", marginBottom: 15, gap: 10 },
  modalFilterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9" },
  modalFilterBtnActive: { backgroundColor: "#2563EB" },
  modalFilterText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  modalFilterTextActive: { color: "#FFFFFF" },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backBtn: { padding: 8, marginRight: 15 },
  headerInfo: { flex: 1 },
  chatContactName: { fontSize: 18, fontWeight: "bold" },
  chatContactRole: { fontSize: 13, color: "#64748B" },
  chatContainer: { padding: 20 },
  messageBubbleWrapper: { marginBottom: 15, maxWidth: "80%" },
  alignRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  alignLeft: { alignSelf: "flex-start", alignItems: "flex-start" },
  messageBubble: { padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: "#2563EB" },
  otherBubble: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  chatMessageText: { fontSize: 15 },
  myText: { color: "#FFFFFF" },
  otherText: { color: "#1E293B" },
  chatTimeLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  inputContainer: { flexDirection: "row", alignItems: "center", padding: 15, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  chatTextInput: { flex: 1, backgroundColor: "#F1F5F9", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  readOnlyContainer: { padding: 20, alignItems: "center" },
  readOnlyText: { color: "#64748B", fontSize: 13 }
});
