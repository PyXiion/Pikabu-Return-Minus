declare function MD5(value: string): string;

declare namespace PikabuJson
{
  interface Story
  {
    /**
     * Story id
     */
    story_id: number;

    /**
     * Story pluses
     */
    story_pluses: number;

    /**
     * Story minuses
     */
    story_minuses: number;

    /**
     * Story rating
     */
    story_digs: number;
  }

  interface Comment
  {
    /**
     * Comment id
     */
    comment_id: number;

    /**
     * Comment parent id
     * 
     * If equal to 0, the comment is root
     */
    parent_id: number;

    /**
     * Comment rating
     */
    comment_rating: number;

    /**
     * Comment pluses
     */
    comment_pluses: number;

    /**
     * Comment minuses
     */
    comment_minuses: number;
  }

  interface Error
  {
    message: string;
    message_code: number;
  }

  interface Response
  {
    response?: any;
    error?: Error;
  }

  interface StoryGetResponse
  {
    /**
     * Story
     */
    story?: Story;

    /**
     * Comments
     */
    comments: Comment[];

    /**
     * True if there are no more comments
     */
    has_next_page_comments: boolean;
  }

  type RequestParams = {[k: string]: string | number};
  type RequestParamsGetStory = RequestParams & {
    story_id: number,
    page?: number,
    selected_comment_id?: number
  };
}