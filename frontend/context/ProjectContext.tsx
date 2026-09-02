import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSettings } from '@/context/SettingsContext';
import {
  createCast,
  createFrames,
  createScenes,
  createVideo,
  deleteItem as deleteItemRemote,
  fetchProject,
  generateItemImage,
  patchItem as patchItemRemote,
  resetRemoteProject,
  updateProject,
} from '@/lib/api';
import {
  createDemoProject,
  FIXTURE_DELAY,
  mockCast,
  mockFrames,
  mockImage,
  mockScenes,
} from '@/lib/fixtures';
import { videoPosterPlaceholder } from '@/lib/placeholders';
import { IMAGE_CONCURRENCY, needsImage, runPool, withPendingImage, type ImageTarget } from '@/lib/project';
import type { Frame, ImageKind, Person, Project, Scene, Thing } from '@/types/project';

const DEFAULT_IDEA =
  'A barista discovers their latte art comes alive at midnight and starts a tiny revolution in the coffee shop.';

export type ProjectContextValue = {
  project: Project;
  hydrated: boolean;
  testMode: boolean;
  error: string | null;
  setIdea: (idea: string) => void;
  setStyle: (style: string) => void;
  setDuration: (durationSec: number) => void;
  setTestMode: (on: boolean) => void;
  loadDemoProject: () => void;
  generateCast: (options?: { replace?: boolean }) => Promise<void>;
  generateScenes: (options?: { replace?: boolean }) => Promise<void>;
  generateFrames: (options?: { replace?: boolean }) => Promise<void>;
  generateImage: (kind: ImageKind, id: string) => Promise<void>;
  generatePersonImage: (id: string) => Promise<void>;
  generateThingImage: (id: string) => Promise<void>;
  generateSceneImage: (id: string) => Promise<void>;
  generateFrameImage: (id: string) => Promise<void>;
  generateAllCastImages: () => Promise<void>;
  generateAllSceneImages: () => Promise<void>;
  generateAllFrameImages: () => Promise<void>;
  updateItem: (
    kind: ImageKind,
    id: string,
    fields: {
      name?: string;
      role?: string;
      look?: string;
      title?: string;
      action?: string;
      camera?: string;
    },
  ) => Promise<void>;
  removeItem: (kind: ImageKind, id: string) => Promise<void>;
  resetProject: () => Promise<void>;
  refreshProject: () => Promise<void>;
  generateVideo: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

const emptyProject = (style: string, durationSec: number): Project => ({
  id: 'current',
  title: '',
  idea: DEFAULT_IDEA,
  style,
  styleNotes: '',
  durationSec,
  people: [],
  things: [],
  scenes: [],
  frames: [],
  videoReady: false,
  totalCost: 0,
});

function findItem(project: Project, kind: ImageKind, id: string): ImageTarget | undefined {
  switch (kind) {
    case 'person':
      return project.people.find((item) => item.id === id);
    case 'thing':
      return project.things.find((item) => item.id === id);
    case 'scene':
      return project.scenes.find((item) => item.id === id);
    case 'frame':
      return project.frames.find((item) => item.id === id);
  }
}

function updateItem(
  project: Project,
  kind: ImageKind,
  id: string,
  patch: (item: ImageTarget) => ImageTarget,
): Project {
  switch (kind) {
    case 'person':
      return {
        ...project,
        people: project.people.map((item) =>
          item.id === id ? (patch(item) as Person) : item,
        ),
      };
    case 'thing':
      return {
        ...project,
        things: project.things.map((item) =>
          item.id === id ? (patch(item) as Thing) : item,
        ),
      };
    case 'scene':
      return {
        ...project,
        scenes: project.scenes.map((item) =>
          item.id === id ? (patch(item) as Scene) : item,
        ),
      };
    case 'frame':
      return {
        ...project,
        frames: project.frames.map((item) =>
          item.id === id ? (patch(item) as Frame) : item,
        ),
      };
  }
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const {
    settings,
    hydrated: settingsHydrated,
    set: setSetting,
  } = useSettings();

  const [project, setProject] = useState<Project>(() =>
    emptyProject(settings.defaultStyle, settings.defaultDuration),
  );
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectRef = useRef(project);
  projectRef.current = project;

  const testMode = settings.testMode;
  const testModeRef = useRef(testMode);
  testModeRef.current = testMode;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const persistReady = useRef(false);
  const imageJobs = useRef(new Set<string>());

  useEffect(() => {
    if (!settingsHydrated || hydrated) return;
    let cancelled = false;

    (async () => {
      const s = settingsRef.current;
      if (s.testMode) {
        persistReady.current = false;
        if (!cancelled) {
          setProject(createDemoProject());
          setHydrated(true);
        }
        return;
      }
      try {
        const remote = await fetchProject();
        persistReady.current = true;
        if (!cancelled) setProject(remote);
      } catch (err) {
        if (!cancelled) {
          persistReady.current = false;
          setProject(emptyProject(s.defaultStyle, s.defaultDuration));
          setError(err instanceof Error ? err.message : 'Could not load project from server');
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [settingsHydrated, hydrated]);

  useEffect(() => {
    if (!hydrated || testMode || !persistReady.current) return;
    const t = setTimeout(() => {
      updateProject({
        idea: projectRef.current.idea,
        style: projectRef.current.style,
        durationSec: projectRef.current.durationSec,
      }).catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not save project');
      });
    }, 400);
    return () => clearTimeout(t);
  }, [project.idea, project.style, project.durationSec, hydrated, testMode]);

  const setTestMode = useCallback(
    (on: boolean) => {
      setSetting('testMode', on);
      setError(null);
      if (on) {
        persistReady.current = false;
        setProject(createDemoProject());
        return;
      }
      fetchProject()
        .then((remote) => {
          persistReady.current = true;
          setProject(remote);
        })
        .catch((err) => {
          persistReady.current = false;
          const s = settingsRef.current;
          setProject(emptyProject(s.defaultStyle, s.defaultDuration));
          setError(err instanceof Error ? err.message : 'Could not load project from server');
        });
    },
    [setSetting],
  );

  const loadDemoProject = useCallback(() => {
    setProject(createDemoProject());
    setError(null);
  }, []);

  const generateOneImage = useCallback(async (kind: ImageKind, id: string): Promise<void> => {
    if (!findItem(projectRef.current, kind, id)) return;
    const jobKey = `${kind}:${id}`;
    if (imageJobs.current.has(jobKey)) return;
    imageJobs.current.add(jobKey);

    setProject((p) =>
      updateItem(p, kind, id, (item) => ({
        ...item,
        imageStatus: 'generating',
        imageError: undefined,
      })),
    );

    try {
      if (testModeRef.current) {
        const mock = await mockImage(id);
        setProject((p) => ({
          ...updateItem(p, kind, id, (item) => ({
            ...item,
            imageStatus: 'done',
            imageUri: mock.uri,
            imageCost: mock.cost,
            imageError: undefined,
            imageStale: false,
          })),
          totalCost: p.totalCost + mock.cost,
        }));
        return;
      }

      const next = await generateItemImage({ kind, id });
      setProject(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image generation failed';
      try {
        if (!testModeRef.current) setProject(await fetchProject());
        else {
          setProject((p) =>
            updateItem(p, kind, id, (item) => ({
              ...item,
              imageStatus: 'error',
              imageError: message,
            })),
          );
        }
      } catch {
        setProject((p) =>
          updateItem(p, kind, id, (item) => ({
            ...item,
            imageStatus: 'error',
            imageError: message,
          })),
        );
      }
      throw err;
    } finally {
      imageJobs.current.delete(jobKey);
    }
  }, []);

  const generateBatch = useCallback(
    async (items: { kind: ImageKind; id: string }[]) => {
      setError(null);
      const cap = settingsRef.current.budgetCap;
      let stopped = false;

      await runPool(items, IMAGE_CONCURRENCY, async ({ kind, id }) => {
        if (stopped) return;
        const current = findItem(projectRef.current, kind, id);
        if (!current || !needsImage(current)) return;

        if (cap > 0 && projectRef.current.totalCost >= cap) {
          stopped = true;
          setError(
            `Stopped at the $${cap.toFixed(2)} budget cap. Raise or disable it in Settings to continue.`,
          );
          return;
        }

        try {
          await generateOneImage(kind, id);
        } catch {
          // Surfaced on the card via imageError. Other stills keep going.
        }
      });
    },
    [generateOneImage],
  );

  const generateImage = useCallback(
    async (kind: ImageKind, id: string) => {
      setError(null);
      try {
        await generateOneImage(kind, id);
      } catch {
        // Surfaced on the card via imageError.
      }
    },
    [generateOneImage],
  );

  const generatePersonImage = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await generateOneImage('person', id);
      } catch {
        // Surfaced on the card via imageError.
      }
    },
    [generateOneImage],
  );

  const generateThingImage = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await generateOneImage('thing', id);
      } catch {
        // Surfaced on the card via imageError.
      }
    },
    [generateOneImage],
  );

  const generateSceneImage = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await generateOneImage('scene', id);
      } catch {
        // Surfaced on the card via imageError.
      }
    },
    [generateOneImage],
  );

  const generateFrameImage = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await generateOneImage('frame', id);
      } catch {
        // Surfaced on the card via imageError.
      }
    },
    [generateOneImage],
  );

  const generateAllCastImages = useCallback(async () => {
    const p = projectRef.current;
    await generateBatch([
      ...p.people.filter(needsImage).map((item) => ({ kind: 'person' as const, id: item.id })),
      ...p.things.filter(needsImage).map((item) => ({ kind: 'thing' as const, id: item.id })),
    ]);
  }, [generateBatch]);

  const generateAllSceneImages = useCallback(async () => {
    const p = projectRef.current;
    await generateBatch(
      p.scenes.filter(needsImage).map((item) => ({ kind: 'scene' as const, id: item.id })),
    );
  }, [generateBatch]);

  const generateAllFrameImages = useCallback(async () => {
    const p = projectRef.current;
    await generateBatch(
      p.frames.filter(needsImage).map((item) => ({ kind: 'frame' as const, id: item.id })),
    );
  }, [generateBatch]);

  const updateItemFields = useCallback(
    async (
      kind: ImageKind,
      id: string,
      fields: {
        name?: string;
        role?: string;
        look?: string;
        title?: string;
        action?: string;
        camera?: string;
      },
    ) => {
      setError(null);
      if (testModeRef.current) {
        setProject((p) =>
          updateItem(p, kind, id, (item) => ({
            ...item,
            ...fields,
            imageStale: item.imageStatus === 'done' ? true : item.imageStale,
          })),
        );
        return;
      }
      try {
        setProject(await patchItemRemote({ kind, id, ...fields }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save edit');
        throw err;
      }
    },
    [],
  );

  const removeItem = useCallback(async (kind: ImageKind, id: string) => {
    setError(null);
    if (testModeRef.current) {
      setProject((p) => {
        const drop = (ids: string[]) => ids.filter((item) => item !== id);
        if (kind === 'person') {
          return {
            ...p,
            people: p.people.filter((item) => item.id !== id),
            scenes: p.scenes.map((s) => ({ ...s, peopleIds: drop(s.peopleIds) })),
            frames: p.frames.map((f) => ({ ...f, peopleIds: drop(f.peopleIds) })),
            videoReady: false,
            videoUri: undefined,
          };
        }
        if (kind === 'thing') {
          return {
            ...p,
            things: p.things.filter((item) => item.id !== id),
            scenes: p.scenes.map((s) => ({ ...s, thingIds: drop(s.thingIds) })),
            frames: p.frames.map((f) => ({ ...f, thingIds: drop(f.thingIds) })),
            videoReady: false,
            videoUri: undefined,
          };
        }
        if (kind === 'scene') {
          return {
            ...p,
            scenes: p.scenes.filter((item) => item.id !== id),
            frames: p.frames.filter((f) => f.sceneId !== id),
            videoReady: false,
            videoUri: undefined,
          };
        }
        return {
          ...p,
          frames: p.frames.filter((item) => item.id !== id),
          videoReady: false,
          videoUri: undefined,
        };
      });
      return;
    }
    try {
      setProject(await deleteItemRemote({ kind, id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove item');
      throw err;
    }
  }, []);

  const refreshProject = useCallback(async () => {
    if (testModeRef.current) return;
    try {
      setProject(await fetchProject());
    } catch {
      // Keep the current snapshot; the next poll retries.
    }
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      hydrated: hydrated && settingsHydrated,
      testMode,
      error,

      setIdea: (idea) => setProject((p) => ({ ...p, idea })),
      setStyle: (style) => setProject((p) => ({ ...p, style })),
      setDuration: (durationSec) => setProject((p) => ({ ...p, durationSec })),
      setTestMode,
      loadDemoProject,

      resetProject: async () => {
        setError(null);
        const s = settingsRef.current;
        if (s.testMode) {
          persistReady.current = false;
          setProject(createDemoProject());
          return;
        }
        try {
          persistReady.current = true;
          setProject(await resetRemoteProject({ style: s.defaultStyle, durationSec: s.defaultDuration }));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not reset project');
        }
      },

      generateCast: async () => {
        setError(null);
        const p = projectRef.current;
        const input = { idea: p.idea, style: p.style, durationSec: p.durationSec };
        if (testModeRef.current) {
          const result = await mockCast(input);
          setProject((prev) => ({
            ...prev,
            title: result.title,
            styleNotes: result.styleNotes,
            people: result.people.map(withPendingImage),
            things: result.things.map(withPendingImage),
            scenes: [],
            frames: [],
            videoReady: false,
            totalCost: result.cost,
          }));
          return;
        }
        try {
          persistReady.current = true;
          setProject(await createCast(input));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Cast failed');
          throw err;
        }
      },

      generateScenes: async () => {
        setError(null);
        if (testModeRef.current) {
          const p = projectRef.current;
          const result = await mockScenes({
            idea: p.idea,
            style: p.style,
            durationSec: p.durationSec,
            people: p.people,
            things: p.things,
          });
          setProject((prev) => ({
            ...prev,
            scenes: result.scenes.map(withPendingImage),
            frames: [],
            videoReady: false,
            totalCost: prev.totalCost + result.cost,
          }));
          return;
        }
        try {
          setProject(await createScenes());
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Scenes failed');
          throw err;
        }
      },

      generateFrames: async () => {
        setError(null);
        if (testModeRef.current) {
          const p = projectRef.current;
          const result = await mockFrames({
            idea: p.idea,
            style: p.style,
            durationSec: p.durationSec,
            people: p.people,
            things: p.things,
            scenes: p.scenes,
          });
          setProject((prev) => ({
            ...prev,
            frames: [...result.frames].sort((a, b) => a.order - b.order).map(withPendingImage),
            videoReady: false,
            totalCost: prev.totalCost + result.cost,
          }));
          return;
        }
        try {
          setProject(await createFrames());
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Frames failed');
          throw err;
        }
      },

      generateImage,
      generatePersonImage,
      generateThingImage,
      generateSceneImage,
      generateFrameImage,
      generateAllCastImages,
      generateAllSceneImages,
      generateAllFrameImages,
      updateItem: updateItemFields,
      removeItem,
      refreshProject,

      generateVideo: async () => {
        const clipTotal = projectRef.current.durationSec > 30 ? 2 : 1;
        setProject((p) => ({
          ...p,
          videoReady: false,
          videoUri: undefined,
          videoError: undefined,
          videoPhase: 'queued',
          videoClipIndex: 1,
          videoClipTotal: clipTotal,
          videoStartedAt: Date.now(),
        }));
        if (testModeRef.current) {
          await new Promise((r) => setTimeout(r, FIXTURE_DELAY.video));
          setProject((p) => {
            const framePoster = p.frames.find(
              (f) => f.imageStatus === 'done' && f.imageUri,
            )?.imageUri;
            const scenePoster = p.scenes.find(
              (s) => s.imageStatus === 'done' && s.imageUri,
            )?.imageUri;
            return {
              ...p,
              videoReady: true,
              videoPhase: 'ready',
              videoPosterUri: framePoster ?? scenePoster ?? videoPosterPlaceholder(),
              videoError: undefined,
            };
          });
          return;
        }
        try {
          setError(null);
          setProject(await createVideo());
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Video failed';
          setError(message);
          try {
            setProject(await fetchProject());
          } catch {
            // Keep the previous project; error is already set.
          }
          throw err;
        }
      },
    }),
    [
      project,
      hydrated,
      settingsHydrated,
      testMode,
      error,
      setTestMode,
      loadDemoProject,
      generateImage,
      generatePersonImage,
      generateThingImage,
      generateSceneImage,
      generateFrameImage,
      generateAllCastImages,
      generateAllSceneImages,
      generateAllFrameImages,
      updateItemFields,
      removeItem,
      refreshProject,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
