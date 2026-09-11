import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityEvent } from "./figuro-activity";
import { makeEvent } from "./figuro-activity";
import type { Folder, Lesson, Material, SourceMode } from "./figuro-lessons";
import { accentFor, findLesson, folderPath, lessonContent } from "./figuro-lessons";
import type { Topic } from "./figuro-data";
import type { NewMaterial } from "./figuro-store";
import {
  deleteFolderRow,
  deleteLessonRow,
  deleteMaterialRow,
  insertEvent,
  insertFolder,
  insertLesson,
  insertMaterial,
  loadAll,
  renameFolderRow,
  updateLessonRow,
  upsertPractice,
} from "./figuro-store";
import type { PracticeActivity } from "./tutor.server";

export { LessonBar } from "@/components/figuro/lesson-bar";

export type FiguroSessionContextType = {
  userId: string | null;
  email: string | null;
  loading: boolean;
  folders: Folder[];
  lessons: Lesson[];
  materials: Material[];
  events: ActivityEvent[];
  practice: Record<string, PracticeActivity>;
  activeLessonId: string | null;
  activeLesson: Lesson | null;
  topic: Topic | null;
  sourceMode: SourceMode;
  setSourceMode: (mode: SourceMode) => void;
  selectLesson: (id: string | null) => void;
  updateProgress: (lessonId: string, progress: number) => Promise<void>;
  addFolder: (name: string, parentId?: string | null) => Promise<Folder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  addLesson: (
    title: string,
    discipline?: string | null,
    folderId?: string | null,
  ) => Promise<Lesson | null>;
  editLesson: (
    id: string,
    patch: { title?: string; discipline?: string; folderId?: string | null },
  ) => Promise<void>;
  removeLesson: (id: string) => Promise<void>;
  addMaterial: (m: NewMaterial) => Promise<Material | null>;
  removeMaterial: (material: Material) => Promise<void>;
  materialsFor: (lessonId: string) => Material[];
  setPractice: (lessonId: string, activity: PracticeActivity) => Promise<void>;
  record: (e: Omit<ActivityEvent, "id" | "at">) => Promise<void>;
  signOut: () => Promise<void>;
};

const FiguroSessionContext = createContext<FiguroSessionContextType | null>(null);

export function FiguroSessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [practice, setPracticeMap] = useState<Record<string, PracticeActivity>>({});
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("materials");

  const loadUserData = useCallback(async (uid: string) => {
    try {
      const data = await loadAll(uid);
      setFolders(data.folders);
      setLessons(data.lessons);
      setMaterials(data.materials);
      setEvents(data.events);
      setPracticeMap(data.practice);
    } catch (err) {
      console.error("Failed to load user data:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user && isMounted) {
          setUserId(data.session.user.id);
          setEmail(data.session.user.email ?? null);
          await loadUserData(data.session.user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          setUserId(session.user.id);
          setEmail(session.user.email ?? null);
          void loadUserData(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setUserId(null);
          setEmail(null);
          setFolders([]);
          setLessons([]);
          setMaterials([]);
          setEvents([]);
          setPracticeMap({});
          setActiveLessonId(null);
        }
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const activeLesson = useMemo(
    () => findLesson(lessons, activeLessonId),
    [lessons, activeLessonId],
  );

  const topic = useMemo(
    () => (activeLesson ? lessonContent(activeLesson) : null),
    [activeLesson],
  );

  const selectLesson = useCallback((id: string | null) => {
    setActiveLessonId(id);
  }, []);

  const updateProgress = useCallback(
    async (lessonId: string, progress: number) => {
      const clamped = Math.min(100, Math.max(0, Math.round(progress)));
      setLessons((prev) =>
        prev.map((l) =>
          l.id === lessonId ? { ...l, progress: clamped, lastActivity: "Just now" } : l,
        ),
      );
      if (userId) {
        await updateLessonRow(lessonId, {
          progress: clamped,
          last_activity: new Date().toISOString(),
        });
      }
    },
    [userId],
  );

  const addFolder = useCallback(
    async (name: string, parentId: string | null = null) => {
      if (userId) {
        const folder = await insertFolder(userId, name, parentId);
        if (folder) {
          setFolders((prev) => [...prev, folder]);
          return folder;
        }
      } else {
        const localFolder: Folder = {
          id: `folder-${Date.now()}`,
          name: name.trim(),
          parentId,
        };
        setFolders((prev) => [...prev, localFolder]);
        return localFolder;
      }
      return null;
    },
    [userId],
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)),
      );
      if (userId) {
        await renameFolderRow(id, name);
      }
    },
    [userId],
  );

  const removeFolder = useCallback(
    async (id: string) => {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (userId) {
        await deleteFolderRow(id);
      }
    },
    [userId],
  );

  const addLesson = useCallback(
    async (
      title: string,
      discipline?: string | null,
      folderId: string | null = null,
    ) => {
      const disc =
        typeof discipline === "string" && discipline.trim()
          ? discipline.trim()
          : "Custom topic";
      if (userId) {
        try {
          const lesson = await insertLesson(userId, title, disc, folderId);
          if (lesson) {
            setLessons((prev) => [lesson, ...prev]);
            setActiveLessonId(lesson.id);
            return lesson;
          }
        } catch (err) {
          console.error("Error adding lesson:", err);
        }
      } else {
        const localLesson: Lesson = {
          id: `lesson-${Date.now()}`,
          title: title.trim(),
          discipline: disc,
          folderId,
          progress: 0,
          lastActivity: "Just created",
          accent: accentFor(title),
        };
        setLessons((prev) => [localLesson, ...prev]);
        setActiveLessonId(localLesson.id);
        return localLesson;
      }
      return null;
    },
    [userId],
  );

  const editLesson = useCallback(
    async (
      id: string,
      patch: { title?: string; discipline?: string; folderId?: string | null },
    ) => {
      setLessons((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          return {
            ...l,
            title: patch.title ?? l.title,
            discipline: patch.discipline ?? l.discipline,
            folderId: patch.folderId !== undefined ? patch.folderId : l.folderId,
            accent: patch.title ? accentFor(patch.title) : l.accent,
          };
        }),
      );
      if (userId) {
        await updateLessonRow(id, {
          ...(patch.title ? { title: patch.title } : {}),
          ...(patch.discipline ? { discipline: patch.discipline } : {}),
          ...(patch.folderId !== undefined ? { folder_id: patch.folderId } : {}),
        });
      }
    },
    [userId],
  );

  const removeLesson = useCallback(
    async (id: string) => {
      setLessons((prev) => prev.filter((l) => l.id !== id));
      if (activeLessonId === id) {
        setActiveLessonId(null);
      }
      if (userId) {
        await deleteLessonRow(id);
      }
    },
    [activeLessonId, userId],
  );

  const addMaterial = useCallback(
    async (m: NewMaterial) => {
      if (userId) {
        const mat = await insertMaterial(userId, m);
        if (mat) {
          setMaterials((prev) => [mat, ...prev]);
          return mat;
        }
      } else {
        const localMat: Material = {
          id: `mat-${Date.now()}`,
          lessonId: m.lessonId ?? null,
          folderId: m.folderId ?? null,
          kind: m.kind,
          title: m.title.trim() || "Untitled",
          content: m.content ?? null,
          url: m.url ?? null,
          storagePath: m.storagePath ?? null,
          mimeType: m.mimeType ?? null,
          extracted: m.extracted ?? false,
          createdAt: new Date().toISOString(),
        };
        setMaterials((prev) => [localMat, ...prev]);
        return localMat;
      }
      return null;
    },
    [userId],
  );

  const removeMaterial = useCallback(
    async (m: Material) => {
      setMaterials((prev) => prev.filter((item) => item.id !== m.id));
      if (userId) {
        await deleteMaterialRow(m);
      }
    },
    [userId],
  );

  const materialsFor = useCallback(
    (lessonId: string) => {
      const lesson = lessons.find((l) => l.id === lessonId);
      if (!lesson) return materials.filter((m) => m.lessonId === lessonId);
      const fPath = folderPath(folders, lesson.folderId).map((f) => f.id);
      return materials.filter(
        (m) =>
          m.lessonId === lessonId ||
          (m.folderId !== null && fPath.includes(m.folderId)),
      );
    },
    [lessons, folders, materials],
  );

  const setPractice = useCallback(
    async (lessonId: string, activity: PracticeActivity) => {
      setPracticeMap((prev) => ({ ...prev, [lessonId]: activity }));
      if (userId) {
        await upsertPractice(userId, lessonId, activity);
      }
    },
    [userId],
  );

  const record = useCallback(
    async (eventData: Omit<ActivityEvent, "id" | "at">) => {
      const newEv = makeEvent(eventData);
      setEvents((prev) => [...prev, newEv]);
      if (userId) {
        await insertEvent(userId, eventData);
      }
    },
    [userId],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setEmail(null);
    setFolders([]);
    setLessons([]);
    setMaterials([]);
    setEvents([]);
    setPracticeMap({});
    setActiveLessonId(null);
  }, []);

  const value = useMemo<FiguroSessionContextType>(
    () => ({
      userId,
      email,
      loading,
      folders,
      lessons,
      materials,
      events,
      practice,
      activeLessonId,
      activeLesson,
      topic,
      sourceMode,
      setSourceMode,
      selectLesson,
      updateProgress,
      addFolder,
      renameFolder,
      removeFolder,
      addLesson,
      editLesson,
      removeLesson,
      addMaterial,
      removeMaterial,
      materialsFor,
      setPractice,
      record,
      signOut,
    }),
    [
      userId,
      email,
      loading,
      folders,
      lessons,
      materials,
      events,
      practice,
      activeLessonId,
      activeLesson,
      topic,
      sourceMode,
      selectLesson,
      updateProgress,
      addFolder,
      renameFolder,
      removeFolder,
      addLesson,
      editLesson,
      removeLesson,
      addMaterial,
      removeMaterial,
      materialsFor,
      setPractice,
      record,
      signOut,
    ],
  );

  return (
    <FiguroSessionContext.Provider value={value}>
      {children}
    </FiguroSessionContext.Provider>
  );
}

export function useFiguroSession() {
  const ctx = useContext(FiguroSessionContext);
  if (!ctx) {
    throw new Error("useFiguroSession must be used within a FiguroSessionProvider");
  }
  return ctx;
}