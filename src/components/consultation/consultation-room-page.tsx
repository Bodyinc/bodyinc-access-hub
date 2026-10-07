import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  RefreshCw,
  Repeat,
  Send,
  Video,
  VideoOff,
  X,
  AlertTriangle,
  User,
  Activity,
  FileText,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Volume2,
  Paperclip,
  Download,
  Clock,
  Calendar,
  History as HistoryIcon,
  Stethoscope,
  Save,
  Info,
  Search,
  ChevronRight,
  ListFilter,
  Users,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequestNotes } from "@/components/admin/request-notes";

import {
  getConsultationRoomDetails,
  finishConsultationAppointment,
  saveConsultationClinicalNote,
  type ConsultationRoomData,
  type LiveQueueItem,
} from "@/lib/consultations.functions";
import {
  approveRequest,
  rejectRequest,
  sendRequestToPharmacy,
  assignRequestProvider,
} from "@/lib/requests.functions";
import { listProviders } from "@/lib/providers.functions";
import { RequestChangeMedicineDialog } from "@/components/admin/request-change-medicine-dialog";
import { formatDateTimeFull, formatRecordId } from "@/lib/format";
import { toastError, toastActionWithEmail } from "@/lib/toast-message";
import { sentenceCase } from "@/lib/text-normalize";

// Generic QuickBlox typing for browser window
interface QbWebrtcSession {
  ID: string;
  initiatorId: number;
  callType: number;
  state: number;
  getUserMedia: (
    params: {
      audio: boolean;
      video: boolean;
      options?: { muted?: boolean; mirror?: boolean };
      elemId?: string;
    },
    callback: (err: unknown, stream: MediaStream) => void,
  ) => void;
  call: (extension: Record<string, unknown>, callback?: (err: unknown) => void) => void;
  accept: (extension: Record<string, unknown>) => void;
  reject: (extension: Record<string, unknown>) => void;
  stop: (extension: Record<string, unknown>) => void;
  mute: (type: "audio" | "video") => void;
  unmute: (type: "audio" | "video") => void;
  attachMediaStream: (elemId: string, stream: MediaStream) => void;
}

type ChatAttachmentItem = {
  id?: number | string;
  uid?: string;
  name?: string;
  size?: number;
  type?: string;
  url?: string;
};

type ChatMessageItem = {
  id: string;
  senderId: number;
  senderName: string;
  senderRole?: "admin" | "provider" | "patient" | "system";
  body: string;
  dateSent: number;
  isSelf: boolean;
  isSystem?: boolean;
  type?: string;
  attachments?: ChatAttachmentItem[];
};

interface QuickBloxClient {
  init: (
    appId: number,
    authKey: string,
    authSecret: string,
    accountKey: string,
    config?: Record<string, unknown>,
  ) => void;
  createSession: (
    creds: { email?: string; id?: number; login?: string; password?: string } | ((err: unknown, res: { token: string }) => void),
    callback?: (err: unknown, res: { token: string; user_id?: number }) => void,
  ) => void;
  startSessionWithToken: (
    token: string,
    callback: (err: unknown, res: { token: string; user_id?: number }) => void,
  ) => void;
  content?: {
    createAndUpload: (
      params: {
        file: File;
        name?: string;
        type?: string;
        size?: number;
        public?: boolean;
      },
      callback: (
        err: unknown,
        res: {
          id: number;
          uid: string;
          name: string;
          content_type: string;
          size: number;
        },
      ) => void,
    ) => void;
    privateUrl: (uidOrId: string | number) => string;
    publicUrl: (uid: string) => string;
  };
  chat: {
    isConnected: boolean;
    connect: (
      creds: { userId: number; password?: string },
      callback: (err: unknown) => void,
    ) => void;
    disconnect: () => void;
    send: (
      recipient: string | number,
      msg: {
        type: string;
        body: string;
        extension: { save_to_history?: number; dialog_id?: string | null; attachments?: ChatAttachmentItem[]; [key: string]: unknown };
        markable?: number;
      },
    ) => string;
    sendSystemMessage?: (
      dialogIdOrJid: string | number,
      message: { extension: Record<string, unknown> },
    ) => string;
    helpers?: {
      getUserJid?: (userId: number) => string;
      [key: string]: unknown;
    };
    sendIsTypingStatus: (recipient: string | number) => void;
    sendIsStopTypingStatus: (recipient: string | number) => void;
    onMessageListener?: (
      userId: number,
      msg: {
        _id?: string;
        id?: string;
        body?: string;
        date_sent?: number;
        extension?: { dialog_id?: string; attachments?: ChatAttachmentItem[] };
      },
    ) => void;
    onMessageTypingListener?: (isTyping: boolean, userId: number, dialogId?: string) => void;
    muc: {
      join: (jid: string, callback: (res: unknown) => void) => void;
      leave: (jid: string, callback?: () => void) => void;
    };
    dialog: {
      list: (
        params: { _id?: string; limit?: number },
        callback: (
          err: unknown,
          res: {
            items?: Array<{
              _id: string;
              xmpp_room_jid?: string;
              type: number;
              occupants_ids: number[];
            }>;
          },
        ) => void,
      ) => void;
    };
    message: {
      list: (
        params: { chat_dialog_id: string; sort_desc?: string; limit?: number },
        callback: (
          err: unknown,
          res: {
            items?: Array<{
              _id: string;
              sender_id: number;
              message: string;
              date_sent: number;
              attachments?: ChatAttachmentItem[];
            }>;
          },
        ) => void,
      ) => void;
    };
  };
  webrtc?: {
    CallType: { VIDEO: number; AUDIO: number };
    createNewSession: (
      calleesIds: number[],
      callType: number,
      tag?: string | null,
      options?: Record<string, unknown>,
    ) => QbWebrtcSession;
    onCallListener?: (session: QbWebrtcSession, extension: Record<string, unknown>) => void;
    onRemoteStreamListener?: (
      session: QbWebrtcSession,
      userId: number,
      stream: MediaStream,
    ) => void;
    onAcceptCallListener?: (
      session: QbWebrtcSession,
      userId: number,
      extension: Record<string, unknown>,
    ) => void;
    onRejectCallListener?: (
      session: QbWebrtcSession,
      userId: number,
      extension: Record<string, unknown>,
    ) => void;
    onStopCallListener?: (
      session: QbWebrtcSession,
      userId: number,
      extension: Record<string, unknown>,
    ) => void;
    onUserNotAnswerListener?: (session: QbWebrtcSession, userId: number) => void;
    onSessionCloseListener?: (session: QbWebrtcSession) => void;
  };
}

declare global {
  interface Window {
    QB?: QuickBloxClient;
  }
}

interface ConsultationRoomPageProps {
  requestId: string;
  backTo?: string;
  clinicalOnly?: boolean;
  canManage?: boolean;
}

export function ConsultationRoomPage({
  requestId,
  backTo = "/provider/requests",
  clinicalOnly = true,
  canManage = false,
}: ConsultationRoomPageProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Server functions
  const getDetails = useServerFn(getConsultationRoomDetails);
  const finishAppt = useServerFn(finishConsultationAppointment);
  const saveClinicalNote = useServerFn(saveConsultationClinicalNote);
  const approve = useServerFn(approveRequest);
  const reject = useServerFn(rejectRequest);
  const sendPharmacy = useServerFn(sendRequestToPharmacy);
  const listProv = useServerFn(listProviders);
  const assignProv = useServerFn(assignRequestProvider);

  // Queries
  const { data: resData, isLoading, error, refetch } = useQuery({
    queryKey: ["consultation-room-details", requestId],
    queryFn: () => getDetails({ data: { requestId } }),
  });

  const roomData: ConsultationRoomData | undefined = resData?.ok ? resData.data : undefined;

  const providersQ = useQuery({
    queryKey: ["assignable-providers"],
    queryFn: () => listProv({ data: { status: "active" } }),
  });

  // Local UI State
  const [activeMainTab, setActiveMainTab] = useState<"chat" | "call" | "notes" | "history" | "qb-web">("chat");
  const [changeMedOpen, setChangeMedOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [sendPharmacyOpen, setSendPharmacyOpen] = useState(false);
  const [directions, setDirections] = useState("");
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [finishConclusion, setFinishConclusion] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"vitals" | "intake" | "eligibility">("vitals");

  // Live Queue panel & search state
  const [showQueuePane, setShowQueuePane] = useState(true);
  const [queueSearch, setQueueSearch] = useState("");
  const [queueTab, setQueueTab] = useState<"open" | "all">("open");

  // Selected queue conversation (allows talking with another patient from the Live Queue)
  const [selectedQueueItem, setSelectedQueueItem] = useState<LiveQueueItem | null>(null);
  const selectedQueueItemRef = useRef<LiveQueueItem | null>(null);
  useEffect(() => {
    selectedQueueItemRef.current = selectedQueueItem;
  }, [selectedQueueItem]);

  // Clinical note authoring
  const [clinicalNoteText, setClinicalNoteText] = useState("");

  // QuickBlox & Call State
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting to QuickBlox…");
  const [chatConnected, setChatConnected] = useState(false);
  const [activeDialogJid, setActiveDialogJid] = useState<string | null>(null);

  // WebRTC Calling State
  const [activeCall, setActiveCall] = useState<{
    session: QbWebrtcSession;
    isVideo: boolean;
    startTime: number;
  } | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState("00:00");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Live In-Room Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [patientTyping, setPatientTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Refs
  const currentSessionRef = useRef<QbWebrtcSession | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure media streams attach to DOM elements when call is active
  useEffect(() => {
    if (activeCall) {
      if (localStreamRef.current) {
        const localElem = document.getElementById("localVideoElem") as HTMLVideoElement | null;
        if (localElem && localElem.srcObject !== localStreamRef.current) {
          localElem.srcObject = localStreamRef.current;
          localElem.play().catch(() => {});
        }
      }
      if (remoteStreamRef.current) {
        const remoteElem = document.getElementById("remoteVideoElem") as HTMLVideoElement | null;
        if (remoteElem && remoteElem.srcObject !== remoteStreamRef.current) {
          remoteElem.srcObject = remoteStreamRef.current;
          remoteElem.play().catch(() => {});
        }
      }
    }
  }, [activeCall, activeMainTab]);

  // Scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // Audio ringtone helper
  const playRingtone = useCallback(() => {
    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio("/phone-ring.wav");
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // Timer for active call
  useEffect(() => {
    if (!activeCall) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeCall.startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const secs = String(elapsed % 60).padStart(2, "0");
      setCallDuration(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  // Cleanup local streams
  const cleanupStreams = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    const localElem = document.getElementById("localVideoElem") as HTMLVideoElement | null;
    if (localElem) localElem.srcObject = null;
    const remoteElem = document.getElementById("remoteVideoElem") as HTMLVideoElement | null;
    if (remoteElem) remoteElem.srcObject = null;
  }, []);

  // End Call
  const endCall = useCallback(() => {
    stopRingtone();
    cleanupStreams();
    if (currentSessionRef.current) {
      try {
        currentSessionRef.current.stop({});
      } catch {}
      currentSessionRef.current = null;
    }
    setActiveCall(null);
    setIsCalling(false);
    setIsMuted(false);
    setIsVideoMuted(false);
    setCallDuration("00:00");
  }, [cleanupStreams, stopRingtone]);

  // Resolve sender details (name, role, self) from QuickBlox directory and context
  const resolveSender = useCallback(
    (senderId: number) => {
      const myUserId = roomData?.quickblox.providerSession.userId;
      const isMe = senderId === myUserId;

      const dir = roomData?.quickblox.userDirectory?.[senderId];
      if (dir) {
        return {
          isSelf: isMe,
          senderName: isMe ? "You" : dir.name,
          senderRole: dir.role,
        };
      }

      if (
        senderId === 142814409 ||
        (roomData?.quickblox.adminQbUserId && senderId === roomData.quickblox.adminQbUserId)
      ) {
        return {
          isSelf: isMe,
          senderName: isMe ? "You" : "Admin",
          senderRole: "admin" as const,
        };
      }

      const activePatientId = selectedQueueItem?.clientId || roomData?.quickblox.patientQbUserId;
      const activePatientName = selectedQueueItem?.patientName || roomData?.patient.name || "Patient";
      if (senderId === activePatientId) {
        return {
          isSelf: isMe,
          senderName: isMe ? "You" : activePatientName,
          senderRole: "patient" as const,
        };
      }

      const queueMatch = roomData?.liveQueue.find((q) => q.clientId === senderId);
      if (queueMatch) {
        return {
          isSelf: isMe,
          senderName: isMe ? "You" : queueMatch.patientName,
          senderRole: "patient" as const,
        };
      }

      if (isMe) {
        return {
          isSelf: true,
          senderName: "You",
          senderRole: clinicalOnly ? ("provider" as const) : ("admin" as const),
        };
      }

      return {
        isSelf: false,
        senderName: `User #${senderId}`,
        senderRole: "provider" as const,
      };
    },
    [clinicalOnly, roomData, selectedQueueItem],
  );

  const formatDatePill = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const parseRawMessage = useCallback(
    (rawItem: any): ChatMessageItem => {
      const senderInfo = resolveSender(rawItem.sender_id);
      const isJoin =
        rawItem.type === "joined" ||
        rawItem.notification_type === 1 ||
        rawItem.type === "system";

      let body = rawItem.message || "";
      let isSystem = false;

      if (isJoin) {
        isSystem = true;
        if (senderInfo.isSelf) {
          body = "You have joined the chat";
        } else if (senderInfo.senderRole === "admin") {
          body = "Admin has joined the chat";
        } else if (senderInfo.senderRole === "provider") {
          body = `${senderInfo.senderName} has joined the chat`;
        } else {
          body = `${senderInfo.senderName} has joined the chat`;
        }
      }

      const attachments = (rawItem.attachments as any[]) || [];

      return {
        id: rawItem._id || String(Date.now() + Math.random()),
        senderId: rawItem.sender_id,
        senderName: senderInfo.senderName,
        senderRole: isSystem ? "system" : senderInfo.senderRole,
        body: body || (attachments[0]?.name ? `📎 ${attachments[0].name}` : isSystem ? "" : "Attachment"),
        dateSent: rawItem.date_sent ? rawItem.date_sent * 1000 : Date.now(),
        isSelf: senderInfo.isSelf,
        isSystem,
        type: rawItem.type,
        attachments,
      };
    },
    [resolveSender],
  );

  // Load QuickBlox SDK script if not already present
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.QB) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "/quickblox.min.js";
    script.async = true;
    script.onload = () => {
      if (window.QB) {
        setSdkLoaded(true);
      }
    };
    script.onerror = () => {
      setConnectionStatus("Failed to load QuickBlox SDK script");
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script to allow caching
    };
  }, []);

  // Initialize QuickBlox and Connect Chat & WebRTC
  useEffect(() => {
    if (!sdkLoaded || !roomData) return;
    const QB = window.QB;
    if (!QB) return;

    try {
      QB.init(
        roomData.quickblox.appId,
        roomData.quickblox.authKey,
        roomData.quickblox.authSecret,
        roomData.quickblox.accountKey,
      );

      // WebRTC Call Listeners
      if (QB.webrtc) {
        QB.webrtc.onRemoteStreamListener = (session, userId, stream) => {
          console.log("[QuickBlox] onRemoteStreamListener:", userId, stream);
          remoteStreamRef.current = stream;
          const remoteElem = document.getElementById("remoteVideoElem") as HTMLVideoElement | null;
          if (remoteElem) {
            remoteElem.srcObject = stream;
            remoteElem.play().catch(() => {});
          }
        };

        QB.webrtc.onAcceptCallListener = (session) => {
          stopRingtone();
          setIsCalling(false);
          setActiveCall({
            session,
            isVideo: session.callType === QB.webrtc?.CallType.VIDEO,
            startTime: Date.now(),
          });
          toast.success("Patient connected to call");
        };

        QB.webrtc.onRejectCallListener = () => {
          stopRingtone();
          toast.info("Patient declined the call.");
          endCall();
        };

        QB.webrtc.onStopCallListener = () => {
          toast.info("Call concluded.");
          endCall();
        };

        QB.webrtc.onUserNotAnswerListener = () => {
          stopRingtone();
          toast.info("Patient did not answer.");
          endCall();
        };

        QB.webrtc.onSessionCloseListener = () => {
          endCall();
        };
      }

      // Step 1: Start Session with Provider Token
      const token = roomData.quickblox.providerSession.token;
      const onSessionReady = () => {
        setConnectionStatus("Connected to QuickBlox");

        // Step 2: Connect to QuickBlox Chat Server (XMPP)
        if (QB.chat) {
          const providerUid = roomData.quickblox.providerSession.userId;
          const providerPass =
            roomData.quickblox.providerSession.password || token;

          QB.chat.connect({ userId: providerUid, password: providerPass }, (chatErr) => {
            if (chatErr) {
              console.warn("[QuickBlox] QB.chat.connect with password error:", chatErr);
              // Fallback: retry with token
              QB.chat.connect({ userId: providerUid, password: token }, (retryErr) => {
                if (retryErr) {
                  console.warn("[QuickBlox] QB.chat.connect with token failed:", retryErr);
                } else {
                  setChatConnected(true);
                  setupDialogAndListeners();
                }
              });
            } else {
              setChatConnected(true);
              setupDialogAndListeners();
            }
          });
        }
      };

      const setupDialogAndListeners = () => {
        if (!QB.chat) return;

        // Step 3: Listen for incoming messages
        QB.chat.onMessageListener = (userId, msg) => {
          if (userId === roomData.quickblox.providerSession.userId) return;

          const msgDialogId = (msg.extension as any)?.dialog_id;
          const activeDialogId =
            selectedQueueItemRef.current?.dialogId || roomData.consultation.dialogId;
          if (activeDialogId && msgDialogId && msgDialogId !== activeDialogId) {
            return;
          }

          const parsed = parseRawMessage({
            _id: msg._id || msg.id,
            sender_id: userId,
            message: msg.body,
            date_sent: msg.date_sent,
            attachments: (msg.extension as any)?.attachments,
            type: (msg as any).type || (msg.extension as any)?.notification_type,
          });

          if (!parsed.isSystem && !parsed.body && (!parsed.attachments || parsed.attachments.length === 0)) {
            return;
          }

          setChatMessages((prev) => {
            if (prev.some((m) => m.id === parsed.id)) return prev;
            return [...prev, parsed];
          });
        };

        // Step 4: Listen for patient typing indicator
        if (QB.chat.onMessageTypingListener) {
          QB.chat.onMessageTypingListener = (isTyping, userId) => {
            if (userId !== roomData.quickblox.providerSession.userId) {
              setPatientTyping(isTyping);
              if (isTyping) {
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => setPatientTyping(false), 4000);
              }
            }
          };
        }

        // Step 5: Join MUC room & fetch message history for this consultation
        const targetDialogId = roomData.consultation.dialogId;
        if (targetDialogId) {
          QB.chat.dialog.list({ _id: targetDialogId }, (dErr, dRes) => {
            if (!dErr && dRes?.items?.length) {
              const dialog = dRes.items[0];
              if (dialog.xmpp_room_jid) {
                setActiveDialogJid(dialog.xmpp_room_jid);
                QB.chat.muc.join(dialog.xmpp_room_jid, () => {
                  console.log("[QuickBlox] Provider joined MUC room:", dialog.xmpp_room_jid);
                });
              }
            }
          });

          // Fetch message history
          QB.chat.message.list(
            { chat_dialog_id: targetDialogId, sort_desc: "date_sent", limit: 50 },
            (mErr, mRes) => {
              if (!mErr && mRes?.items?.length) {
                const historical: ChatMessageItem[] = mRes.items
                  .map(parseRawMessage)
                  .reverse();
                setChatMessages(historical);
              }
            },
          );
        }
      };

      if (typeof (QB as any).startSessionWithToken === "function") {
        (QB as any).startSessionWithToken(token, (sessErr: unknown) => {
          if (sessErr) {
            console.warn("[QuickBlox] startSessionWithToken error:", sessErr);
          }
          onSessionReady();
        });
      } else {
        (QB as any).createSession({ token }, (sessErr: unknown) => {
          if (sessErr) console.warn("[QuickBlox] createSession error:", sessErr);
          onSessionReady();
        });
      }
    } catch (e) {
      console.error("[QuickBlox] Init exception:", e);
      setConnectionStatus("Error connecting to QuickBlox");
    }
  }, [sdkLoaded, roomData, stopRingtone, endCall]);

  // Initiate Call: Audio or Video
  const startCall = (isVideo: boolean) => {
    const QB = window.QB;
    if (!QB?.webrtc) {
      toast.error("QuickBlox WebRTC calling is not available yet.");
      return;
    }

    if (!chatConnected) {
      toast.error("Calling connection is still connecting. Please wait a moment.");
      return;
    }

    const patientQbUserId = selectedQueueItem?.clientId || roomData?.quickblox.patientQbUserId;
    if (!patientQbUserId) {
      toast.error("Patient QuickBlox User ID is not available. Please wait for provisioning.");
      return;
    }

    try {
      const callType = isVideo ? QB.webrtc.CallType.VIDEO : QB.webrtc.CallType.AUDIO;
      const session = QB.webrtc.createNewSession([patientQbUserId], callType);
      currentSessionRef.current = session;

      const mediaParams = {
        audio: true,
        video: isVideo ? true : false,
        options: { muted: false, mirror: isVideo },
      };

      session.getUserMedia(mediaParams, (err, stream) => {
        if (err) {
          console.error("[QuickBlox] getUserMedia error:", err);
          const errName = (err as any)?.name || "";
          const errMsg = (err as any)?.message || String(err);
          if (errName === "NotAllowedError" || errMsg.includes("Permission denied")) {
            toast.error("Microphone/Camera permission denied. Please allow device access.");
          } else if (errName === "NotFoundError" || errMsg.includes("not found")) {
            toast.error("No camera or microphone found on this device.");
          } else {
            toast.error(`Media access failed: ${errMsg}`);
          }
          return;
        }

        localStreamRef.current = stream;

        try {
          session.call({
            appointment_id: selectedQueueItem?.appointmentId || roomData?.consultation.appointmentId,
            doctor_name: roomData?.provider?.full_name || "Doctor",
          });
        } catch (callErr) {
          console.warn("[QuickBlox] session.call error:", callErr);
        }

        setIsCalling(true);
        setActiveCall({
          session,
          isVideo,
          startTime: Date.now(),
        });

        // Switch automatically to call tab so provider sees the stage
        setActiveMainTab("call");
        playRingtone();
        const callTargetName = selectedQueueItem?.patientName || patient.name;
        toast.info(isVideo ? `Calling ${callTargetName} (Video)…` : `Calling ${callTargetName} (Audio)…`);
      });
    } catch (err) {
      console.error("[QuickBlox] Start call error:", err);
      toast.error("Failed to initiate call. You can open the QuickBlox Web App above.");
    }
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (!activeCall?.session) return;
    if (isMuted) {
      activeCall.session.unmute("audio");
      setIsMuted(false);
      toast.info("Microphone unmuted");
    } else {
      activeCall.session.mute("audio");
      setIsMuted(true);
      toast.info("Microphone muted");
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (!activeCall?.session || !activeCall.isVideo) return;
    if (isVideoMuted) {
      activeCall.session.unmute("video");
      setIsVideoMuted(false);
      toast.info("Camera enabled");
    } else {
      activeCall.session.mute("video");
      setIsVideoMuted(true);
      toast.info("Camera disabled");
    }
  };

  // Send Chat message
  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || !roomData) return;
    const QB = window.QB;
    if (!QB?.chat) return;

    const targetDialogId = selectedQueueItem?.dialogId || roomData.consultation.dialogId;
    const targetRecipient =
      activeDialogJid ||
      targetDialogId ||
      selectedQueueItem?.clientId ||
      roomData.quickblox.patientQbUserId;

    if (!targetRecipient) {
      toast.error("No active chat recipient or dialog found.");
      return;
    }

    const isGroup = Boolean(activeDialogJid);
    const msgPayload = {
      type: isGroup ? "groupchat" : "chat",
      body: text,
      extension: {
        save_to_history: 1,
        dialog_id: targetDialogId,
      },
      markable: 1,
    };

    try {
      const sentId = QB.chat.send(targetRecipient, msgPayload);
      const newMsg: ChatMessageItem = {
        id: sentId || `msg_${Date.now()}`,
        senderId: roomData.quickblox.providerSession.userId,
        senderName: "You",
        senderRole: clinicalOnly ? "provider" : "admin",
        body: text,
        dateSent: Date.now(),
        isSelf: true,
      };

      setChatMessages((prev) => [...prev, newMsg]);
      setChatInput("");

      if (targetRecipient && typeof QB.chat.sendIsStopTypingStatus === "function") {
        QB.chat.sendIsStopTypingStatus(targetRecipient);
      }
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("[QuickBlox] Send chat message failed:", err);
      toast.error("Failed to send message.");
    }
  };

  // File / Photo Attachment Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomData) return;
    e.target.value = ""; // Reset file input

    const QB = window.QB;
    if (!QB || !chatConnected) {
      toast.error("Chat connection is not ready. Please wait.");
      return;
    }

    const targetDialogId = selectedQueueItem?.dialogId || roomData.consultation.dialogId;
    const targetRecipient =
      activeDialogJid ||
      targetDialogId ||
      selectedQueueItem?.clientId ||
      roomData.quickblox.patientQbUserId;

    if (!targetRecipient) {
      toast.error("No active chat recipient found.");
      return;
    }

    setUploadingFile(true);
    setUploadProgress(`Uploading ${file.name}…`);

    const isGroup = Boolean(activeDialogJid);

    if (QB.content && typeof QB.content.createAndUpload === "function") {
      QB.content.createAndUpload(
        { file, name: file.name, type: file.type, size: file.size, public: false },
        (err, res) => {
          setUploadingFile(false);
          setUploadProgress(null);

          if (err || !res) {
            console.error("[QuickBlox] File upload error:", err);
            toast.error("Failed to upload document.");
            return;
          }

          const fileUid = res.uid || String(res.id);
          const downloadUrl = QB.content ? QB.content.privateUrl(fileUid) : "";
          const isPhoto = file.type.startsWith("image/");

          const attachmentItem: ChatAttachmentItem = {
            id: res.id,
            uid: res.uid,
            name: file.name,
            size: file.size,
            type: isPhoto ? "photo" : "file",
            url: downloadUrl,
          };

          const msgPayload = {
            type: isGroup ? "groupchat" : "chat",
            body: `📎 ${file.name}`,
            extension: {
              save_to_history: 1,
              dialog_id: targetDialogId,
              attachments: [attachmentItem],
            },
            markable: 1,
          };

          try {
            const sentId = QB.chat.send(targetRecipient, msgPayload);
            const newMsg: ChatMessageItem = {
              id: sentId || `msg_${Date.now()}`,
              senderId: roomData.quickblox.providerSession.userId,
              senderName: "You",
              senderRole: clinicalOnly ? "provider" : "admin",
              body: `📎 ${file.name}`,
              dateSent: Date.now(),
              isSelf: true,
              attachments: [attachmentItem],
            };
            setChatMessages((prev) => [...prev, newMsg]);
            toast.success("Attachment sent.");
          } catch (sendErr) {
            console.error("[QuickBlox] Send attachment error:", sendErr);
            toast.error("Failed to send attachment.");
          }
        },
      );
    } else {
      setUploadingFile(false);
      setUploadProgress(null);
      toast.error("QuickBlox content upload is not available.");
    }
  };

  // Typing change handler
  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    const QB = window.QB;
    if (!QB?.chat || !roomData) return;
    const targetRecipient =
      activeDialogJid ||
      selectedQueueItem?.dialogId ||
      roomData.consultation.dialogId ||
      selectedQueueItem?.clientId ||
      roomData.quickblox.patientQbUserId;

    if (targetRecipient && typeof QB.chat.sendIsTypingStatus === "function") {
      QB.chat.sendIsTypingStatus(targetRecipient);
    }
  };

  // Handle switching active conversation to a patient from the Live Queue
  const handleSelectQueueItem = useCallback(
    (item: LiveQueueItem) => {
      // If the queue patient belongs to a different medication request, navigate so the entire clinical chart, vitals & intake load
      if (item.requestId && item.requestId !== requestId) {
        navigate({
          to: clinicalOnly
            ? "/provider/requests/$requestId/consultation"
            : "/admin/requests/$requestId/consultation",
          params: { requestId: item.requestId },
        });
        return;
      }

      // In-place chat & dialog switch
      setSelectedQueueItem(item);
      selectedQueueItemRef.current = item;

      const QB = window.QB;
      if (!QB?.chat) {
        toast.info(`Switched conversation to ${item.patientName}`);
        return;
      }

      // Leave previous MUC room
      if (activeDialogJid && typeof QB.chat.muc?.leave === "function") {
        try {
          QB.chat.muc.leave(activeDialogJid, () => {});
        } catch {}
      }
      setActiveDialogJid(null);
      setChatMessages([]);

      if (item.dialogId) {
        // Look up dialog and join MUC room
        QB.chat.dialog.list({ _id: item.dialogId }, (dErr, dRes) => {
          if (!dErr && dRes?.items?.length) {
            const dialog = dRes.items[0];
            if (dialog.xmpp_room_jid) {
              setActiveDialogJid(dialog.xmpp_room_jid);
              QB.chat.muc.join(dialog.xmpp_room_jid, () => {
                console.log("[QuickBlox] Joined MUC room:", dialog.xmpp_room_jid);
              });
            }
          }
        });

        // Load message history for this dialog
        QB.chat.message.list(
          { chat_dialog_id: item.dialogId, sort_desc: "date_sent", limit: 50 },
          (mErr, mRes) => {
            if (!mErr && mRes?.items?.length) {
              const historical: ChatMessageItem[] = mRes.items
                .map(parseRawMessage)
                .reverse();
              setChatMessages(historical);
            }
          },
        );
        toast.success(`Chat connected to ${item.patientName}`);
      } else {
        toast.info(`Switched to ${item.patientName}.`);
      }
    },
    [activeDialogJid, clinicalOnly, navigate, parseRawMessage, requestId, roomData],
  );

  // Save Clinical Note Mutation
  const saveNoteMut = useMutation({
    mutationFn: () => saveClinicalNote({ data: { requestId, note: clinicalNoteText } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.message || "Failed to save clinical note.");
        return;
      }
      toast.success("Clinical note recorded in patient history.");
      setClinicalNoteText("");
      refetch();
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  // Provider Assignment Mutation
  const assignMut = useMutation({
    mutationFn: (providerId: string | null) =>
      assignProv({ data: { requestId, providerId } }),
    onSuccess: (res, providerId) => {
      if (res.alreadyAssigned) {
        toast.info(`Already assigned to ${res.providerName}`);
        return;
      }
      toast.success("Provider assigned & QuickBlox consultation connected.");

      // Notify via QuickBlox chat system message if active
      const QB = window.QB;
      if (QB?.chat) {
        const targetProv = ((providersQ.data as any[]) ?? []).find((p: any) => p.id === providerId);
        if (targetProv?.qb_user_id) {
          const provJid = QB.chat.helpers?.getUserJid
            ? QB.chat.helpers.getUserJid(targetProv.qb_user_id)
            : `${targetProv.qb_user_id}@chat.quickblox.com`;
          try {
            QB.chat.sendSystemMessage?.(provJid, {
              extension: {
                notification_type: "PROVIDER_HAS_ASSIGNED_CLIENT_TO_YOU",
                notification_text: "PROVIDER_HAS_ASSIGNED_CLIENT_TO_YOU",
              },
            });
          } catch {}
        }
        if (roomData?.quickblox.patientQbUserId) {
          const patJid = QB.chat.helpers?.getUserJid
            ? QB.chat.helpers.getUserJid(roomData.quickblox.patientQbUserId)
            : `${roomData.quickblox.patientQbUserId}@chat.quickblox.com`;
          try {
            QB.chat.sendSystemMessage?.(patJid, {
              extension: {
                notification_type: "YOU_HAVE_NEW_PROVIDER",
                notification_text: "YOU_HAVE_NEW_PROVIDER",
              },
            });
          } catch {}
        }
      }

      refetch();
      qc.invalidateQueries({ queryKey: ["request", requestId] });
      qc.invalidateQueries({ queryKey: ["assignable-providers"] });
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  // Finish Consultation Mutation (mirroring QuickBlox web behavior)
  const finishMut = useMutation({
    mutationFn: async (variables?: { conclusion?: string }) => {
      const conclusionText = variables?.conclusion?.trim() || "Consultation completed";
      const QB = window.QB;

      // Send chat message to consultation dialog
      const targetDialogId = selectedQueueItem?.dialogId || roomData?.consultation.dialogId;
      const targetRecipient = activeDialogJid || targetDialogId;
      if (QB?.chat && targetRecipient) {
        try {
          QB.chat.send(targetRecipient, {
            type: activeDialogJid ? "groupchat" : "chat",
            body: `📋 Consultation completed by clinician.\nSummary: ${conclusionText}`,
            extension: {
              save_to_history: 1,
              dialog_id: targetDialogId,
              notification_type: "CONCLUSION",
            },
            markable: 1,
          });
        } catch (mErr) {
          console.warn("[QuickBlox] send dialog conclusion msg failed:", mErr);
        }
      }

      // Send QuickBlox system message to patient so the patient portal reflects conclusion immediately
      if (QB?.chat && roomData?.quickblox.patientQbUserId) {
        try {
          const clientJid = QB.chat.helpers?.getUserJid
            ? QB.chat.helpers.getUserJid(roomData.quickblox.patientQbUserId)
            : `${roomData.quickblox.patientQbUserId}@chat.quickblox.com`;
          QB.chat.sendSystemMessage?.(clientJid, {
            extension: {
              notification_type: "CONCLUSION",
              notification_text: conclusionText,
            },
          });
        } catch (sysErr) {
          console.warn("[QuickBlox] sendSystemMessage CONCLUSION failed:", sysErr);
        }
      }

      return finishAppt({ data: { requestId, conclusion: conclusionText } });
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Consultation completed. Patient portal status updated.");
      endCall();
      setFinishConfirmOpen(false);
      setFinishConclusion("");
      refetch();
      qc.invalidateQueries({ queryKey: ["request", requestId] });
      qc.invalidateQueries({ queryKey: ["pending-consultation-count"] });
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  // Approve Order Mutation
  const approveMut = useMutation({
    mutationFn: () =>
      approve({
        data: {
          requestId,
          note: approveNote.trim() ? sentenceCase(approveNote) : undefined,
        },
      }),
    onSuccess: (res) => {
      if ((res as any)?.pharmacy_error) {
        toast.error((res as any).pharmacy_error);
        refetch();
        return;
      }
      toastActionWithEmail(
        clinicalOnly ? "Order approved clinically." : "Order approved and sent to LifeFile.",
        (res as any)?.email_sent,
      );
      setApproveOpen(false);
      setApproveNote("");
      refetch();
      qc.invalidateQueries({ queryKey: ["request", requestId] });
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  // Reject Order Mutation
  const rejectMut = useMutation({
    mutationFn: () =>
      reject({
        data: {
          requestId,
          note: rejectNote.trim() ? sentenceCase(rejectNote) : undefined,
        },
      }),
    onSuccess: (res) => {
      toastActionWithEmail(
        clinicalOnly ? "Order rejected." : "Order rejected and refunded.",
        (res as any)?.email_sent,
      );
      setRejectOpen(false);
      setRejectNote("");
      refetch();
      qc.invalidateQueries({ queryKey: ["request", requestId] });
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  // Send to Pharmacy Mutation
  const sendPharmacyMut = useMutation({
    mutationFn: () =>
      sendPharmacy({
        data: {
          requestId,
          directions: sentenceCase(directions) || undefined,
        },
      }),
    onSuccess: (res) => {
      toastActionWithEmail(
        res?.lifeFileOrderId
          ? `Sent to LifeFile: ${res.lifeFileOrderId}`
          : "Sent to pharmacy.",
        res?.email_sent,
      );
      setSendPharmacyOpen(false);
      setDirections("");
      refetch();
      qc.invalidateQueries({ queryKey: ["request", requestId] });
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FBFA]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6A9B9C]" />
          <p className="text-sm font-medium text-[#3B4759]">Loading consultation room…</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || !roomData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FBFA] p-6">
        <Card className="max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Unable to load consultation</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Consultation room data could not be retrieved."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate({ to: backTo })}>
              Back to Requests
            </Button>
            <Button onClick={() => refetch()} className="bg-[#6A9B9C] text-white">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = roomData.patient;
  const isConsultationEnded = Boolean(roomData.consultation.isEnded || roomData.consultation.endedAt);

  // Live Queue calculations
  const liveQueueList = roomData.liveQueue ?? [];
  const openQueueCount = liveQueueList.filter((item) => !item.isEnded).length;
  const allQueueCount = liveQueueList.length;

  const filteredQueue = liveQueueList.filter((item) => {
    if (queueTab === "open" && item.isEnded) return false;
    if (queueSearch.trim()) {
      const q = queueSearch.toLowerCase();
      const match =
        item.patientName.toLowerCase().includes(q) ||
        (item.medicineName && item.medicineName.toLowerCase().includes(q)) ||
        (item.patientEmail && item.patientEmail.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F3F6F6] font-['DM_Sans',sans-serif]">
      {/* Hidden File Input for Attachment Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />

      {/* TOP HEADER */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#D5DEDD] bg-white px-4 md:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: backTo })}
            className="h-9 gap-1.5 px-2.5 text-xs text-[#3B4759] hover:bg-[#F3F6F6]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Request</span>
          </Button>

          <div className="h-5 w-[1px] bg-[#D5DEDD]" />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#152A51] text-xs font-bold text-white">
              {patient.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#152A51]">{patient.name}</span>
                {roomData.medicine && (
                  <Badge variant="outline" className="border-[#6A9B9C]/40 bg-[#6A9B9C]/10 text-[11px] text-[#2C5E5F]">
                    {roomData.medicine.name}
                  </Badge>
                )}
                {isConsultationEnded ? (
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[11px]">
                    Consultation Ended
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/15 text-[11px] border border-emerald-300">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Visit
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-[#3B4759]/70 font-medium">
                Order {formatRecordId(roomData.request.id)}
              </div>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Top Bar Assigned Clinician Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#D5DEDD] bg-[#F9FBFA] px-2.5 py-1 text-xs">
            <Stethoscope className="h-3.5 w-3.5 text-[#6A9B9C] shrink-0" />
            <span className="hidden xl:inline text-[#3B4759]/70 text-[11px] font-medium">Clinician:</span>
            <Select
              value={roomData.provider?.id || "unassigned"}
              onValueChange={(val) => {
                assignMut.mutate(val === "unassigned" ? null : val);
              }}
              disabled={assignMut.isPending}
            >
              <SelectTrigger className="h-7 min-w-[140px] sm:min-w-[170px] border-none bg-transparent p-0 text-xs font-semibold text-[#152A51] focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Assign clinician">
                  {assignMut.isPending ? (
                    <span className="flex items-center gap-1 text-[#6A9B9C]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Assigning…
                    </span>
                  ) : (
                    roomData.provider?.full_name || "Unassigned"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="unassigned" className="text-xs text-amber-700">
                  Unassigned
                </SelectItem>
                {((providersQ.data as any[]) ?? []).map((prov) => (
                  <SelectItem key={prov.id} value={prov.id} className="text-xs">
                    {prov.full_name || prov.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Connection Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#D5DEDD] bg-[#F9FBFA] px-3 py-1 text-[11px] text-[#3B4759]">
            <span
              className={`h-2 w-2 rounded-full ${
                chatConnected ? "bg-emerald-500" : "bg-amber-400 animate-ping"
              }`}
            />
            <span>{chatConnected ? "Connected to QuickBlox" : connectionStatus}</span>
          </div>

          {/* External QuickBlox Web App Link */}
          {roomData.consultation.externalUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 border-[#D5DEDD] px-2.5 text-xs text-[#3B4759] hover:bg-[#F3F6F6]"
            >
              <a href={roomData.consultation.externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden md:inline"></span>
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* FINISHED CONSULTATION BANNER */}
      {isConsultationEnded && (
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-4 md:px-6 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              This consultation appointment is finished
              {roomData.consultation.endedAt ? ` (${formatDateTimeFull(roomData.consultation.endedAt)})` : ""}.
            </span>
          </div>
          <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 text-[10px] shadow-none">
            Concluded
          </Badge>
        </div>
      )}

      {/* FLOATING IN-CALL BANNER (Active regardless of current main tab) */}
      {activeCall && (
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-emerald-300 bg-emerald-50 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div className="text-xs font-semibold text-emerald-950">
              {activeCall.isVideo ? "Active Video Call" : "Active Audio Call"} with {patient.name}
            </div>
            <div className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-900">
              {callDuration}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleMute}
              className={`h-8 px-2.5 text-xs ${isMuted ? "border-red-300 bg-red-100 text-red-700" : "bg-white text-emerald-900"}`}
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5 mr-1" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
              <span>{isMuted ? "Unmute" : "Mute"}</span>
            </Button>

            {activeCall.isVideo && (
              <Button
                size="sm"
                variant="outline"
                onClick={toggleVideo}
                className={`h-8 px-2.5 text-xs ${isVideoMuted ? "border-amber-300 bg-amber-100 text-amber-800" : "bg-white text-emerald-900"}`}
              >
                {isVideoMuted ? <VideoOff className="h-3.5 w-3.5 mr-1" /> : <Video className="h-3.5 w-3.5 mr-1" />}
                <span>{isVideoMuted ? "Enable Cam" : "Stop Cam"}</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setFinishConfirmOpen(true)}
              className="h-8 bg-[#152A51] text-xs font-semibold text-white hover:bg-[#1C3665] shadow-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
              <span>Finish Appointment</span>
            </Button>

            <Button
              size="sm"
              onClick={endCall}
              className="h-8 bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
            >
              <PhoneOff className="h-3.5 w-3.5 mr-1" />
              <span>End Call</span>
            </Button>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: Patient Info & Intake Sidebar */}
        <aside className="w-80 lg:w-96 shrink-0 border-r border-[#D5DEDD] bg-white flex flex-col overflow-hidden shadow-xs">
          {/* Patient Quick Vitals Header */}
          <div className="border-b border-[#D5DEDD] p-4 bg-[#F9FBFA]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-[#152A51]">{patient.name}</h2>
                <p className="text-xs text-[#3B4759]/80 mt-0.5">
                  DOB: {patient.dob || "—"}{" "}
                  {patient.age ? `(${patient.age} yrs)` : ""} · {patient.sex ? patient.sex.toUpperCase() : "—"}
                </p>
                <p className="text-xs text-[#3B4759]/70 mt-0.5">
                  State: <span className="font-semibold text-[#152A51]">{patient.state_code || "—"}</span>
                  {patient.phone ? ` · Tel: ${patient.phone}` : ""}
                </p>
              </div>

              {patient.bmi && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#3B4759]/60">BMI</span>
                  <div className="text-sm font-extrabold text-[#152A51]">{patient.bmi.toFixed(1)}</div>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {patient.bmi < 18.5 ? "Underweight" : patient.bmi < 25 ? "Normal" : patient.bmi < 30 ? "Overweight" : "Obese"}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-[#D5DEDD] bg-white p-2">
                <span className="text-[11px] text-[#3B4759]/60">Height / Weight</span>
                <p className="font-semibold text-[#152A51]">
                  {patient.height_cm ? `${patient.height_cm} cm` : "—"} / {patient.weight_kg ? `${patient.weight_kg} kg` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-[#D5DEDD] bg-white p-2">
                <span className="text-[11px] text-[#3B4759]/60">Treatment</span>
                <p className="font-semibold text-[#152A51] truncate">
                  {roomData.medicine?.name || "Treatment"}
                </p>
              </div>
            </div>

            {/* Dynamic action buttons matching request review permissions */}
            {(() => {
              const requestStatus = roomData.request.status;
              const isUnassigned = !roomData.provider;
              const waitingOnProvider = requestStatus === "pending_review" && canManage && !isUnassigned;
              const canReject =
                (requestStatus === "pending_review" || requestStatus === "awaiting_additional_payment") &&
                (!clinicalOnly || !isUnassigned);
              const canChange =
                ["pending_review", "approved", "awaiting_additional_payment"].includes(requestStatus) &&
                (!clinicalOnly || !isUnassigned);
              const sentToLifeFile =
                ["sent_to_pharmacy", "dispatched", "delivered"].includes(requestStatus);
              const canApprove =
                clinicalOnly &&
                !isUnassigned &&
                !sentToLifeFile &&
                ["pending_review", "approved", "prescribed"].includes(requestStatus);
              const canSendToPharmacy =
                canManage &&
                !sentToLifeFile &&
                ["approved", "prescribed"].includes(requestStatus);

              return (
                <div className="mt-3 space-y-2">
                  {waitingOnProvider ? (
                    <p className="rounded-md bg-[#F3F6F6] p-2 text-[11px] font-medium text-[#3B4759]/80 leading-snug">
                      Waiting for assigned provider to approve. Approval sends order to pharmacy.
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {canApprove ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setApproveOpen(true)}
                        disabled={approveMut.isPending}
                        className="flex-1 min-w-[75px] h-8 text-[11px] font-semibold bg-[#6A9B9C] text-white hover:bg-[#5A8788] px-1"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        <span className="truncate">Approve</span>
                      </Button>
                    ) : null}

                    {canSendToPharmacy ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setSendPharmacyOpen(true)}
                        disabled={sendPharmacyMut.isPending}
                        className="flex-1 min-w-[100px] h-8 text-[11px] font-semibold bg-[#6A9B9C] text-white hover:bg-[#5A8788] px-1"
                      >
                        <Truck className="h-3 w-3 mr-1" />
                        <span className="truncate">Send pharmacy</span>
                      </Button>
                    ) : null}

                    {canChange ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setChangeMedOpen(true)}
                        className="flex-1 min-w-[85px] h-8 text-[11px] font-semibold border-[#D5DEDD] text-[#3B4759] hover:bg-[#F3F6F6] px-1"
                        title="Change Medicines"
                      >
                        <Repeat className="h-3 w-3 mr-1 text-[#6A9B9C]" />
                        <span className="truncate">Change med</span>
                      </Button>
                    ) : null}

                    {canReject ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setRejectOpen(true)}
                        disabled={rejectMut.isPending}
                        className="flex-1 min-w-[65px] h-8 text-[11px] font-semibold bg-[#8F4A33] text-white hover:bg-[#7A3E2B] px-1"
                      >
                        <X className="h-3 w-3 mr-1" />
                        <span className="truncate">{clinicalOnly ? "Reject" : "Reject & refund"}</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sidebar Tab Selector */}
          <div className="flex border-b border-[#D5DEDD] bg-white">
            <button
              type="button"
              onClick={() => setSidebarTab("vitals")}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
                sidebarTab === "vitals"
                  ? "border-[#152A51] text-[#152A51]"
                  : "border-transparent text-[#3B4759]/60 hover:text-[#152A51]"
              }`}
            >
              Patient Profile
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("intake")}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
                sidebarTab === "intake"
                  ? "border-[#152A51] text-[#152A51]"
                  : "border-transparent text-[#3B4759]/60 hover:text-[#152A51]"
              }`}
            >
              Intake ({roomData.answers.length})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("eligibility")}
              className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition ${
                sidebarTab === "eligibility"
                  ? "border-[#152A51] text-[#152A51]"
                  : "border-transparent text-[#3B4759]/60 hover:text-[#152A51]"
              }`}
            >
              Eligibility ({roomData.eligibility.length})
            </button>
          </div>

          {/* Sidebar Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sidebarTab === "vitals" && (
              <div className="space-y-3">
                <Card className="border-[#D5DEDD] shadow-none">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs font-bold text-[#152A51]">Order Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 space-y-2 text-xs divide-y divide-[#E8EEED]">
                    <div className="pt-1 flex justify-between">
                      <span className="text-[#3B4759]/70">Medication</span>
                      <span className="font-semibold text-[#152A51]">{roomData.medicine?.name || "—"}</span>
                    </div>
                    {roomData.package && (
                      <div className="pt-2 flex justify-between">
                        <span className="text-[#3B4759]/70">Plan</span>
                        <span className="font-semibold text-[#152A51]">{roomData.package.name}</span>
                      </div>
                    )}
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#3B4759]/70">Created</span>
                      <span className="font-medium text-[#3B4759]">{formatDateTimeFull(roomData.request.created_at)}</span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#3B4759]/70">QuickBlox Client ID</span>
                      <span className="font-mono text-[11px] text-[#152A51]">{roomData.quickblox.patientQbUserId || "—"}</span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-[#3B4759]/70">Appointment ID</span>
                      <span className="font-mono text-[11px] text-[#152A51] truncate max-w-[150px]">
                        {roomData.consultation.appointmentId || "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {roomData.goals.length > 0 && (
                  <Card className="border-[#D5DEDD] shadow-none">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-bold text-[#152A51]">Health Goals</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {roomData.goals.map((g, i) => (
                          <Badge key={i} variant="outline" className="text-[11px] bg-[#F9FBFA] border-[#D5DEDD] text-[#3B4759]">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {sidebarTab === "intake" && (
              <div className="space-y-2.5">
                {roomData.answers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D5DEDD] p-4 text-center text-xs text-[#3B4759]/70">
                    No intake responses recorded for this session.
                  </div>
                ) : (
                  roomData.answers.map((ans) => (
                    <div
                      key={ans.id}
                      className={`rounded-lg border p-3 text-xs shadow-2xs ${
                        ans.isDisqualifying
                          ? "border-red-200 bg-red-50/70"
                          : "border-[#D5DEDD] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-[#3B4759]/80 leading-snug">{ans.prompt}</span>
                        {ans.isDisqualifying && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                            Flag
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 font-semibold text-[#152A51]">{ans.answer}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {sidebarTab === "eligibility" && (
              <div className="space-y-2.5">
                {roomData.eligibility.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D5DEDD] p-4 text-center text-xs text-[#3B4759]/70">
                    No automated eligibility evaluations recorded.
                  </div>
                ) : (
                  roomData.eligibility.map((el, i) => (
                    <div key={i} className="rounded-lg border border-[#D5DEDD] bg-white p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#152A51]">{el.medicine_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            el.result === "eligible"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]"
                              : "border-red-300 bg-red-50 text-red-800 text-[10px]"
                          }
                        >
                          {sentenceCase(el.result)}
                        </Badge>
                      </div>
                      {el.reason && <p className="mt-1 text-[#3B4759]/80 text-[11px]">{el.reason}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar Bottom: Prominent Finish Appointment Button */}
          {!isConsultationEnded && (
            <div className="p-3 border-t border-[#D5DEDD] bg-[#F9FBFA]">
              <Button
                type="button"
                onClick={() => setFinishConfirmOpen(true)}
                className="w-full h-10 bg-[#152A51] text-xs font-semibold text-white hover:bg-[#1C3665] shadow-xs"
              >
                <Check className="h-4 w-4 mr-1.5 text-emerald-400" />
                Finish consultation appointment
              </Button>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: MAIN INTERFACE (TABS: Chat, Call, Notes, History, QuickBlox Web) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Main Top Tab Navigation */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#D5DEDD] bg-white px-4">
            <div className="flex items-center gap-1">
              <Button
                variant={activeMainTab === "chat" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveMainTab("chat")}
                className={`h-8 gap-1.5 px-3 text-xs font-semibold ${
                  activeMainTab === "chat" ? "bg-[#152A51] text-white hover:bg-[#152A51]" : "text-[#3B4759] hover:bg-[#F3F6F6]"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Chat</span>
                {chatMessages.length > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 py-0 text-[10px] ${
                    activeMainTab === "chat" ? "bg-white/20 text-white" : "bg-[#D5DEDD] text-[#3B4759]"
                  }`}>
                    {chatMessages.length}
                  </span>
                )}
              </Button>

              <Button
                variant={activeMainTab === "call" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveMainTab("call")}
                className={`h-8 gap-1.5 px-3 text-xs font-semibold ${
                  activeMainTab === "call" ? "bg-[#152A51] text-white hover:bg-[#152A51]" : "text-[#3B4759] hover:bg-[#F3F6F6]"
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                <span>Call & Video</span>
                {activeCall && (
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </Button>

              <Button
                variant={activeMainTab === "notes" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveMainTab("notes")}
                className={`h-8 gap-1.5 px-3 text-xs font-semibold ${
                  activeMainTab === "notes" ? "bg-[#152A51] text-white hover:bg-[#152A51]" : "text-[#3B4759] hover:bg-[#F3F6F6]"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>About & Notes</span>
              </Button>

              <Button
                variant={activeMainTab === "history" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveMainTab("history")}
                className={`h-8 gap-1.5 px-3 text-xs font-semibold ${
                  activeMainTab === "history" ? "bg-[#152A51] text-white hover:bg-[#152A51]" : "text-[#3B4759] hover:bg-[#F3F6F6]"
                }`}
              >
                <HistoryIcon className="h-3.5 w-3.5" />
                <span>History</span>
              </Button>

              <Button
                variant={activeMainTab === "qb-web" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveMainTab("qb-web")}
                className={`h-8 gap-1.5 px-3 text-xs font-semibold ${
                  activeMainTab === "qb-web" ? "bg-[#152A51] text-white hover:bg-[#152A51]" : "text-[#3B4759] hover:bg-[#F3F6F6]"
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>QuickBlox Web</span>
              </Button>
            </div>
          </div>

          {/* TAB 1: REAL-TIME CHAT & LIVE QUEUE */}
          {activeMainTab === "chat" && (
            <div className="flex flex-1 overflow-hidden bg-[#F9FBFA]">
              {/* SUB-PANE 1: LIVE QUEUE (Real-Time QuickBlox Provider Queue) */}
              {showQueuePane && (
                <div className="w-72 xl:w-80 shrink-0 border-r border-[#D5DEDD] bg-white flex flex-col overflow-hidden">
                  {/* Live Queue Header */}
                  <div className="p-3 border-b border-[#D5DEDD] bg-[#F9FBFA] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-[#152A51]" />
                        <h3 className="text-xs font-bold text-[#152A51]">Live Queue</h3>
                        <Badge variant="outline" className="text-[10px] bg-[#6A9B9C]/10 border-[#6A9B9C]/30 text-[#2C5E5F]">
                          {openQueueCount} Waiting
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        className="h-6 w-6 text-[#3B4759] hover:bg-[#E8EEED]"
                        title="Refresh Queue"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Filter Tabs & Search */}
                    <div className="flex items-center gap-1 bg-[#E8EEED]/60 p-0.5 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setQueueTab("open")}
                        className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition ${
                          queueTab === "open"
                            ? "bg-white text-[#152A51] shadow-2xs"
                            : "text-[#3B4759]/70 hover:text-[#152A51]"
                        }`}
                      >
                        Live ({openQueueCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueTab("all")}
                        className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition ${
                          queueTab === "all"
                            ? "bg-white text-[#152A51] shadow-2xs"
                            : "text-[#3B4759]/70 hover:text-[#152A51]"
                        }`}
                      >
                        All ({allQueueCount})
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#3B4759]/40" />
                      <Input
                        value={queueSearch}
                        onChange={(e) => setQueueSearch(e.target.value)}
                        placeholder="Search queue patients…"
                        className="h-7 pl-8 text-[11px] border-[#D5DEDD] bg-white focus-visible:ring-[#6A9B9C]"
                      />
                    </div>
                  </div>

                  {/* Queue Items List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-[#E8EEED]">
                    {filteredQueue.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#3B4759]/60">
                        No appointments found in queue.
                      </div>
                    ) : (
                      filteredQueue.map((item) => {
                        const isSelected = selectedQueueItem
                          ? selectedQueueItem.appointmentId === item.appointmentId
                          : item.isActiveCurrent;
                        return (
                          <button
                            key={item.appointmentId}
                            type="button"
                            onClick={() => handleSelectQueueItem(item)}
                            className={`w-full text-left p-3 transition flex items-start justify-between gap-2 border-l-4 ${
                              isSelected
                                ? "bg-[#152A51]/5 border-l-[#152A51]"
                                : "hover:bg-[#F9FBFA] border-l-transparent"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    isSelected ? "text-[#152A51]" : "text-[#152A51]/90"
                                  }`}
                                >
                                  {item.patientName}
                                </span>
                                {isSelected && (
                                  <Badge className="bg-[#152A51] text-white hover:bg-[#152A51] text-[9px] px-1 py-0 h-4">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-[#3B4759]/70 truncate mt-0.5">
                                {item.medicineName || item.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#3B4759]/60">
                                <span>{new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                                <span>·</span>
                                <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1">
                              {item.isEnded ? (
                                <Badge variant="outline" className="text-[9px] text-slate-500 border-slate-300">
                                  Done
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/15 text-[9px] border border-emerald-300">
                                  In Queue
                                </Badge>
                              )}
                              {!isSelected && (
                                <ChevronRight className="h-3.5 w-3.5 text-[#3B4759]/40 mt-1" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SUB-PANE 2: ACTIVE REAL-TIME CHAT */}
              <div className="flex flex-1 flex-col overflow-hidden bg-[#F9FBFA]">
                {/* Chat Sub-header: status & shortcuts */}
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#D5DEDD] bg-white px-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQueuePane(!showQueuePane)}
                      className="h-7 px-2 text-[11px] text-[#3B4759] hover:bg-[#F3F6F6] gap-1"
                      title={showQueuePane ? "Hide Live Queue" : "Show Live Queue"}
                    >
                      <ListFilter className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{showQueuePane ? "Hide Queue" : "Show Queue"}</span>
                    </Button>
                    <div className="h-3.5 w-[1px] bg-[#D5DEDD]" />
                    <span className="font-semibold text-[#152A51]">
                      {selectedQueueItem ? selectedQueueItem.patientName : "Consultation Conversation"}
                    </span>
                    {selectedQueueItem?.medicineName && (
                      <Badge variant="outline" className="border-[#6A9B9C]/40 bg-[#6A9B9C]/10 text-[10px] text-[#2C5E5F]">
                        {selectedQueueItem.medicineName}
                      </Badge>
                    )}
                    {selectedQueueItem && selectedQueueItem.appointmentId !== roomData.consultation.appointmentId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedQueueItem(null);
                          selectedQueueItemRef.current = null;
                          if (roomData.consultation.dialogId) {
                            handleSelectQueueItem({
                              appointmentId: roomData.consultation.appointmentId || "",
                              clientId: roomData.quickblox.patientQbUserId || 0,
                              dialogId: roomData.consultation.dialogId,
                              patientName: patient.name,
                              patientEmail: patient.email || null,
                              medicineName: roomData.medicine?.name || null,
                              description: "Consultation",
                              createdAt: Date.now(),
                              updatedAt: Date.now(),
                              dateEnd: roomData.consultation.endedAt || null,
                              isEnded: Boolean(roomData.consultation.endedAt),
                              priority: 0,
                              requestId: roomData.request.id,
                              isActiveCurrent: true,
                            });
                          }
                        }}
                        className="h-6 px-1.5 text-[10px] text-[#6A9B9C] hover:text-[#152A51] underline"
                      >
                        (Return to {patient.name})
                      </Button>
                    )}
                    <span className="text-[#3B4759]/60">·</span>
                    <span className="text-[#3B4759]/70 text-[11px]">
                      {chatConnected ? "Encrypted Live Chat" : "Connecting to chat server…"}
                    </span>
                  </div>
                  {patientTyping && (
                    <span className="text-emerald-700 font-medium text-[11px] animate-pulse">
                      Patient is typing…
                    </span>
                  )}
                </div>

                {/* Chat Messages List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                  {/* Intro card */}
                  <div className="mx-auto max-w-md rounded-xl border border-[#D5DEDD] bg-white p-3.5 text-center text-xs shadow-2xs">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#6A9B9C]/15 text-[#6A9B9C]">
                      <Sparkles className="h-4 w-4 text-[#2C5E5F]" />
                    </div>
                    <h3 className="mt-1.5 font-bold text-[#152A51]">Direct Clinician Consultation</h3>
                    <p className="mt-0.5 text-[11px] text-[#3B4759]/80">
                      Live messaging with {selectedQueueItem?.patientName || patient.name}
                      {(selectedQueueItem?.medicineName || roomData.medicine?.name) ? ` for ${selectedQueueItem?.medicineName || roomData.medicine?.name}` : ""}.
                      All messages and attachments synchronize in real time with the patient portal.
                    </p>
                  </div>

                  {chatMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#3B4759]/60">
                      No chat messages yet. Send a greeting or clinical note below.
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const timeStr = new Date(msg.dateSent).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      const isNewDay =
                        idx === 0 ||
                        new Date(msg.dateSent).toDateString() !==
                          new Date(chatMessages[idx - 1].dateSent).toDateString();

                      return (
                        <div key={msg.id} className="space-y-2">
                          {/* Centered Date Separator Pill */}
                          {isNewDay && (
                            <div className="flex justify-center my-3">
                              <span className="rounded-full bg-[#E2E8F0] px-3.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#64748B]">
                                {formatDatePill(msg.dateSent)}
                              </span>
                            </div>
                          )}

                          {/* Centered System / Join Message Pill */}
                          {msg.isSystem ? (
                            <div className="flex justify-center my-1.5">
                              <span className="rounded-full bg-[#CBD5E1]/60 px-4 py-1 text-[11px] font-medium text-[#475569] shadow-2xs">
                                {msg.body}
                              </span>
                            </div>
                          ) : (
                            /* Regular Chat Message Bubble */
                            <div className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}>
                              <div className="flex items-baseline gap-1.5 text-[10px] text-[#3B4759]/60 mb-0.5">
                                <span className="font-bold text-[#152A51]">
                                  {msg.isSelf ? "You" : msg.senderName}
                                </span>
                                {!msg.isSelf && msg.senderRole === "admin" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 h-3.5 border-blue-300 bg-blue-50 text-blue-700 font-semibold"
                                  >
                                    Admin
                                  </Badge>
                                )}
                                {!msg.isSelf && msg.senderRole === "provider" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 h-3.5 border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold"
                                  >
                                    Clinician
                                  </Badge>
                                )}
                                <span>{timeStr}</span>
                              </div>

                              <div
                                className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${
                                  msg.isSelf
                                    ? "rounded-tr-none bg-[#152A51] text-white"
                                    : "rounded-tl-none border border-[#D5DEDD] bg-white text-[#152A51]"
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                                {/* Render Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1.5">
                                    {msg.attachments.map((att, attIdx) => {
                                      const isPhoto =
                                        att.type === "photo" ||
                                        /\.(png|jpe?g|gif|webp)$/i.test(att.name || "");
                                      return (
                                        <div key={attIdx} className="rounded-lg overflow-hidden">
                                          {isPhoto && att.url ? (
                                            <a
                                              href={att.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block transition hover:opacity-90"
                                            >
                                              <img
                                                src={att.url}
                                                alt={att.name || "Attachment"}
                                                className="max-h-48 max-w-full rounded-md object-contain"
                                              />
                                            </a>
                                          ) : (
                                            <a
                                              href={att.url || "#"}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download={att.name || "document"}
                                              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                                                msg.isSelf
                                                  ? "bg-white/15 text-white hover:bg-white/25"
                                                  : "border border-[#D5DEDD] bg-[#F9FBFA] text-[#152A51] hover:bg-[#F3F6F6]"
                                              }`}
                                            >
                                              <Download className="h-3.5 w-3.5 shrink-0" />
                                              <span className="truncate">{att.name || "Download file"}</span>
                                            </a>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Upload Progress Banner */}
                {uploadProgress && (
                  <div className="flex items-center gap-2 border-t border-[#D5DEDD] bg-[#F3F6F6] px-4 py-1.5 text-xs text-[#3B4759]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6A9B9C]" />
                    <span>{uploadProgress}</span>
                  </div>
                )}

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="shrink-0 border-t border-[#D5DEDD] bg-white p-3 flex items-center gap-2"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 text-[#3B4759] hover:bg-[#F3F6F6] shrink-0"
                    title="Upload attachment / photo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Input
                    value={chatInput}
                    onChange={handleChatInputChange}
                    placeholder="Type a message to the patient…"
                    className="h-10 flex-1 border-[#D5DEDD] text-xs focus-visible:ring-[#6A9B9C]"
                  />

                  <Button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="h-10 bg-[#6A9B9C] px-4 text-xs font-semibold text-white hover:bg-[#5A8788] shrink-0"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    <span>Send</span>
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: CALL & VIDEO STAGE */}
          {activeMainTab === "call" && (
            <div className="flex flex-1 flex-col overflow-hidden bg-slate-950 text-white relative">
              {/* Call Canvas */}
              <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                {activeCall ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Remote Patient Video Element */}
                    <video
                      id="remoteVideoElem"
                      autoPlay
                      playsInline
                      className={`w-full h-full object-contain rounded-2xl bg-slate-900 ${
                        !activeCall.isVideo ? "hidden" : ""
                      }`}
                    />

                    {/* Audio Call Visualizer Avatar if not video */}
                    {!activeCall.isVideo && (
                      <div className="flex flex-col items-center justify-center gap-4 text-center">
                        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/20 ring-8 ring-emerald-500/10">
                          <Volume2 className="h-12 w-12 text-emerald-400 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{patient.name}</h3>
                          <p className="text-xs text-slate-400">Audio Consultation in Progress</p>
                          <div className="mt-2 font-mono text-sm font-semibold text-emerald-400">
                            {callDuration}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Picture-in-Picture Local Practitioner Camera Video */}
                    <div className="absolute bottom-4 right-4 z-20 w-44 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
                      <video
                        id="localVideoElem"
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      <span className="absolute bottom-1 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white/80">
                        You
                      </span>
                    </div>
                  </div>
                ) : isConsultationEnded ? (
                  /* Consultation Finished Screen */
                  <div className="max-w-md w-full rounded-2xl border border-emerald-500/20 bg-slate-900/90 p-8 text-center shadow-xl">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-white">Consultation Finished</h2>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      This consultation appointment has concluded. Video and audio calling are closed for completed sessions.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveMainTab("notes")}
                        className="h-10 rounded-xl border-white/20 bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        <span>View Consultation Notes & Order Review</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Idle Calling Screen (Not in active call) */
                  <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-xl">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6A9B9C]/20 text-[#6A9B9C]">
                      <Video className="h-8 w-8 text-[#6A9B9C]" />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-white">Start Live Consultation</h2>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Connect via secure HD video or audio call directly with {patient.name}.
                      The call will ring in the patient’s portal.
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={() => startCall(true)}
                        className="flex-1 h-11 rounded-xl bg-[#6A9B9C] text-sm font-semibold text-white hover:bg-[#5A8788] shadow-md"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        <span>Start Video Call</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => startCall(false)}
                        className="flex-1 h-11 rounded-xl border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/20"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        <span>Start Audio Only</span>
                      </Button>
                    </div>

                    <p className="mt-4 text-[11px] text-slate-500">
                      QuickBlox Client ID: {roomData.quickblox.patientQbUserId || "Auto-assigned"}
                    </p>
                  </div>
                )}
              </div>

              {/* Call Controls Bar at Bottom of Calling Stage */}
              {activeCall && (
                <div className="h-20 shrink-0 bg-slate-900/95 border-t border-white/10 flex items-center justify-center gap-4 px-4 z-30">
                  <Button
                    size="icon"
                    onClick={toggleMute}
                    className={`h-12 w-12 rounded-full ${
                      isMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-white/15 hover:bg-white/25 text-white"
                    }`}
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  {activeCall.isVideo && (
                    <Button
                      size="icon"
                      onClick={toggleVideo}
                      className={`h-12 w-12 rounded-full ${
                        isVideoMuted ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-white/15 hover:bg-white/25 text-white"
                      }`}
                      title={isVideoMuted ? "Enable Camera" : "Disable Camera"}
                    >
                      {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>
                  )}

                  <Button
                    size="icon"
                    onClick={endCall}
                    className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
                    title="End Call"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ABOUT & CLINICAL NOTES */}
          {activeMainTab === "notes" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F9FBFA]">
              {/* Clinician Consultation Note (shared with Request Review Page) */}
              <RequestNotes requestId={requestId} />

              {/* Comprehensive Intake Questionnaire Answers */}
              <Card className="border-[#D5DEDD] shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-[#152A51]">
                    Intake Questionnaire Responses ({roomData.answers.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-[#3B4759]/70">
                    Full responses submitted by the patient during medical intake.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  {roomData.answers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#D5DEDD] p-6 text-center text-xs text-[#3B4759]/60">
                      No questionnaire responses found for this session.
                    </div>
                  ) : (
                    roomData.answers.map((ans) => (
                      <div
                        key={ans.id}
                        className={`rounded-xl border p-3.5 text-xs ${
                          ans.isDisqualifying
                            ? "border-red-200 bg-red-50/60"
                            : "border-[#D5DEDD] bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-medium text-[#3B4759]/90 leading-relaxed">
                            {ans.prompt}
                          </span>
                          {ans.isDisqualifying && (
                            <Badge variant="destructive" className="text-[10px] shrink-0">
                              Risk Flag
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1.5 font-bold text-[#152A51] text-[13px]">{ans.answer}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Patient Demographics & Metrics */}
              <Card className="border-[#D5DEDD] shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-[#152A51]">
                    Patient Demographics & Vitals
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">Full Name</span>
                      <p className="font-bold text-[#152A51] mt-0.5">{patient.name}</p>
                    </div>
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">DOB & Age</span>
                      <p className="font-bold text-[#152A51] mt-0.5">
                        {patient.dob || "—"} ({patient.age ?? "—"} yrs)
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">Biological Sex</span>
                      <p className="font-bold text-[#152A51] mt-0.5">{patient.sex?.toUpperCase() || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">Height & Weight</span>
                      <p className="font-bold text-[#152A51] mt-0.5">
                        {patient.height_cm ? `${patient.height_cm} cm` : "—"} / {patient.weight_kg ? `${patient.weight_kg} kg` : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">Calculated BMI</span>
                      <p className="font-bold text-[#152A51] mt-0.5">{patient.bmi ? patient.bmi.toFixed(1) : "—"}</p>
                    </div>
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">State / Region</span>
                      <p className="font-bold text-[#152A51] mt-0.5">{patient.state_code || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">Contact Phone</span>
                      <p className="font-bold text-[#152A51] mt-0.5">{patient.phone || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-[#D5DEDD] bg-white p-3">
                      <span className="text-[11px] text-[#3B4759]/60">Email</span>
                      <p className="font-bold text-[#152A51] mt-0.5 truncate">{patient.email || "Confidential"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: HISTORY & TIMELINE */}
          {activeMainTab === "history" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F9FBFA]">
              {/* Event Timeline */}
              <Card className="border-[#D5DEDD] shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-[#152A51]">
                    Medication Request Timeline
                  </CardTitle>
                  <CardDescription className="text-xs text-[#3B4759]/70">
                    Chronological audit log of reviews, state transitions, and notes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {(!roomData.events || roomData.events.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-[#D5DEDD] p-6 text-center text-xs text-[#3B4759]/60">
                      No events logged for this request yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {roomData.events.map((ev) => (
                        <div key={ev.id} className="flex gap-3 text-xs">
                          <div className="flex flex-col items-center">
                            <span className="h-2 w-2 rounded-full bg-[#6A9B9C] mt-1.5" />
                            <div className="flex-1 w-[1px] bg-[#D5DEDD] my-1" />
                          </div>
                          <div className="flex-1 rounded-xl border border-[#D5DEDD] bg-white p-3 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#152A51]">{sentenceCase(ev.status)}</span>
                              <span className="text-[11px] text-[#3B4759]/60">
                                {formatDateTimeFull(ev.created_at)}
                              </span>
                            </div>
                            {ev.note && (
                              <p className="mt-1 text-[#3B4759]/90 font-medium whitespace-pre-wrap">
                                {ev.note}
                              </p>
                            )}
                            {ev.actor_role && (
                              <span className="mt-1 inline-block text-[10px] text-[#6A9B9C] font-semibold">
                                Actor: {sentenceCase(ev.actor_role)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Consultations */}
              {roomData.pastConsultations && roomData.pastConsultations.length > 0 && (
                <Card className="border-[#D5DEDD] shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-[#152A51]">
                      Previous Consultations ({roomData.pastConsultations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2">
                    {roomData.pastConsultations.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-[#D5DEDD] bg-white p-3 text-xs">
                        <div>
                          <span className="font-semibold text-[#152A51]">Appointment {c.appointmentId}</span>
                          <p className="text-[11px] text-[#3B4759]/60">Started: {formatDateTimeFull(c.startedAt)}</p>
                        </div>
                        <Badge variant="outline" className={c.endedAt ? "border-emerald-300 text-emerald-800" : "border-amber-300 text-amber-800"}>
                          {c.endedAt ? "Completed" : "In Progress"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB 5: QUICKBLOX WEB IFRAME FALLBACK */}
          {activeMainTab === "qb-web" && (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {roomData.consultation.embedUrl ? (
                <iframe
                  src={roomData.consultation.embedUrl}
                  title="QuickBlox Web App"
                  className="w-full h-full border-0"
                  allow="camera; microphone; display-capture; autoplay"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-[#3B4759]/70">
                  Embed URL not available for this appointment.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* CHANGE MEDICINE DIALOG */}
      {roomData.request && (
        <RequestChangeMedicineDialog
          open={changeMedOpen}
          onOpenChange={setChangeMedOpen}
          requestId={roomData.request.id}
          currentMedicineId={roomData.request.medicine_id ?? undefined}
          currentPackageId={roomData.request.package_id ?? undefined}
          current={{
            medicineName: roomData.medicine?.name ?? null,
            planName: roomData.package?.name ?? null,
            price: roomData.package?.price ?? null,
          }}
          onChanged={() => {
            refetch();
            qc.invalidateQueries({ queryKey: ["request", requestId] });
          }}
        />
      )}

      {/* APPROVE ORDER DIALOG */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="font-['DM_Sans',sans-serif]">
          <DialogHeader>
            <DialogTitle>
              {clinicalOnly ? "Clinically approve order" : "Approve and dispatch order"}
            </DialogTitle>
            <DialogDescription>
              {clinicalOnly
                ? "Confirming clinical approval. A prescription PDF will be generated and dispatched to the pharmacy."
                : "This order will be approved and transmitted to the pharmacy."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <label className="text-[13px] font-medium text-[#3B4759]">Approval Note (optional)</label>
            <Textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="Clinical reason or prescription instructions…"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
              className="bg-[#6A9B9C] text-white hover:bg-[#5A8788]"
            >
              {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT ORDER DIALOG */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="font-['DM_Sans',sans-serif]">
          <DialogHeader>
            <DialogTitle>{clinicalOnly ? "Reject order" : "Reject & refund order"}</DialogTitle>
            <DialogDescription>
              {clinicalOnly
                ? "Reject this medication request based on clinical evaluation."
                : "Rejecting this request will mark it rejected and process refund if paid."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <label className="text-[13px] font-medium text-[#3B4759]">Rejection Reason (optional)</label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Explanation for rejection (sent to patient)…"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => rejectMut.mutate()}
              disabled={rejectMut.isPending}
              className="bg-[#8F4A33] text-white hover:bg-[#7A3E2B]"
            >
              {rejectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SEND TO PHARMACY DIALOG */}
      <Dialog open={sendPharmacyOpen} onOpenChange={setSendPharmacyOpen}>
        <DialogContent className="font-['DM_Sans',sans-serif]">
          <DialogHeader>
            <DialogTitle>Send to pharmacy</DialogTitle>
            <DialogDescription>
              Submit this order for {roomData?.medicine?.name ?? "this medication"} to the pharmacy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <label className="text-[13px] font-medium text-[#3B4759]">Directions (optional)</label>
            <Textarea
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder="e.g. Take as directed. Test Order Do Not Fill"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendPharmacyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendPharmacyMut.mutate()}
              disabled={sendPharmacyMut.isPending}
              className="bg-[#152A51] text-white hover:bg-[#152A51]/90"
            >
              {sendPharmacyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Send to pharmacy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINISH APPOINTMENT CONCLUSION MODAL (Matching QuickBlox Web) */}
      <AlertDialog open={finishConfirmOpen} onOpenChange={setFinishConfirmOpen}>
        <AlertDialogContent className="font-['DM_Sans',sans-serif] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#152A51] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Summary for {patient.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#3B4759]/80">
              Conclude this consultation on QuickBlox and sync with the patient portal.
              A conclusion summary will be recorded in the patient chart and notified in chat.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#152A51] block mb-1">
                Language
              </label>
              <div className="text-xs px-3 py-1.5 rounded border border-[#D5DEDD] bg-[#F9FBFA] text-[#152A51] font-medium inline-block">
                English (en)
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#152A51]">
                  Appointment Summary / Conclusion
                </label>
                <span className="text-[10px] text-[#3B4759]/60">QuickBlox Conclusion</span>
              </div>
              <Textarea
                value={finishConclusion}
                onChange={(e) => setFinishConclusion(e.target.value)}
                placeholder="Enter consultation conclusion or summary (e.g. Patient evaluated, confirmed dosage schedule)…"
                className="min-h-[90px] text-xs border-[#D5DEDD] focus-visible:ring-[#6A9B9C]"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#3B4759]/60">
                Quick Summary Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Patient evaluated and qualified for treatment.",
                  "Confirmed dosage schedule and medication instructions provided.",
                  "Follow-up consultation recommended in 30 days.",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFinishConclusion(preset)}
                    className="text-[11px] rounded bg-[#F3F6F6] hover:bg-[#E5ECEB] text-[#152A51] px-2 py-0.5 border border-[#D5DEDD] transition-colors text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel onClick={() => setFinishConclusion("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finishMut.mutate({ conclusion: finishConclusion.trim() || undefined })}
              disabled={finishMut.isPending}
              className="bg-[#152A51] text-white hover:bg-[#1C3665]"
            >
              {finishMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5 text-emerald-400" />}
              Finish Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
