import { HttpRequest } from "../net/http";

type GollumTagsType = "PostTags" | "CommentTags";

function createGollumTagsGetter(tagsType: GollumTagsType) {
  return async (userId: number) => {
    const request = new HttpRequest(
      `https://gollum.space/api/${userId}-${tagsType}`,
      "GET",
      "json"
    );
    const response = await request.executeAsync();

    const data: Object = response.response;

    return Object.values(data).map((x) => x.TagRU);
  };
}

export const storyTagsGetter = createGollumTagsGetter("PostTags");
export const commentTagsGetter = createGollumTagsGetter("CommentTags");

const idsCache = new Map<string, number>();
export async function getUserId(userName: string) {
  if (idsCache.has(userName)) {
    return idsCache.get(userName);
  }
  const request = new HttpRequest(
    `https://gollum.space/user/${userName.replace(/\./g, "_")}-summary`,
    "GET",
    "text"
  );
  const response = await request.executeAsync();
  const doc = response.responseText as string;

  // we need $.get("/api/2036358-usertotalposts"
  //                     ^^^^^^^

  const match = doc?.match(/\/api\/(\d+)-/i);
  if (!match) throw new Error(`Gollum: user ${userName} was not found`);
  const id = parseInt(match[1]);
  idsCache.set(userName, id);
  return id;
}
