import { useSession } from "next-auth/react";
import React, { useState } from "react";
import Avatar from "./Avatar";
import { LinkIcon, PhotographIcon } from "@heroicons/react/outline";
import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation } from "@apollo/client";
import { ADD_POST, ADD_SUBREDDIT } from "../graphql/mutations";
import client from "../apollo-client";
import { GET_ALL_POSTS, GET_SUBREDDIT_BY_TOPIC } from "../graphql/queries";
import toast from "react-hot-toast";

type FormData = {
  postTitle: string;
  postBody: string;
  postImage: string;
  subreddit: string;
};

type Props = {
  subreddit?: string;
};
const Postbox = ({ subreddit }: Props) => {
  const { data: session } = useSession();
  const [addPost] = useMutation(ADD_POST, {
    refetchQueries: [GET_ALL_POSTS, "getPostList"],
  });
  const [addSubreddit] = useMutation(ADD_SUBREDDIT);
  const [imgBoxOpen, setImgBoxOpen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>();
  const onSubmit = handleSubmit(async (FormData) => {
    const notification = toast.loading("Creating a new post...");
    try {
      // query for the subreddit topic
      const {
        data: { getSubredditListByTopic },
      } = await client.query({
        query: GET_SUBREDDIT_BY_TOPIC,
        variables: {
          topic: subreddit || FormData.subreddit,
        },
      });
      const subredditExists = getSubredditListByTopic.length > 0;
      if (!subredditExists) {
        // create the subreddit
        console.log("Subreddit is new! -> creating a NEW subreddit");
        const {
          data: { insertSubreddit: newSubreddit },
        } = await addSubreddit({
          variables: {
            topic: FormData.subreddit,
          },
        });
        console.log("Creating a post", FormData);
        const image = FormData.postImage || "";
        const {
          data: { insertPost: newPost },
        } = await addPost({
          variables: {
            body: FormData.postBody,
            image: image,
            subreddit_id: newSubreddit.id,
            title: FormData.postTitle,
            username: session?.user?.name,
          },
        });
        console.log("new post added", newPost);
      } else {
        // user the exissting subr
        console.log("Using existing subreddit");
        console.log(getSubredditListByTopic);
        const image = FormData.postImage || "";
        const {
          data: { insertPost: newPost },
        } = await addPost({
          variables: {
            body: FormData.postBody,
            image: image,
            subreddit_id: getSubredditListByTopic[0].id,
            title: FormData.postTitle,
            username: session?.user?.name,
          },
        });
        console.log("New post was created", newPost);
      }
      // after adding the post
      setValue("postBody", "");
      setValue("postTitle", "");
      setValue("postImage", "");
      setValue("subreddit", "");
      toast.success("New post created", {
        id: notification,
      });
    } catch (error) {
      toast.error("Whoops something went wrong", {
        id: notification,
      });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="sticky top-20 z-50 bg-white border rounded-md border-gray-300 p-2"
    >
      <div className="flex items-center space-x-3">
        <Avatar />
        <input
          {...register("postTitle", { required: true })}
          className="bg-gray-50 p-2 pl-5 outline-none flex-1 rounded-md"
          disabled={!session}
          type="text"
          placeholder={
            session
              ? subreddit
                ? `Create a post in r/${subreddit}`
                : "Create a post by entering a title"
              : "Sign in to post"
          }
        />
        <PhotographIcon
          onClick={() => setImgBoxOpen(!imgBoxOpen)}
          className={`h-6 cursor-pointer text-gray-300 ${
            imgBoxOpen && "text-blue-300"
          }`}
        />
        <LinkIcon className="h-6 cursor-pointer text-gray-300" />
      </div>
      {!!watch("postTitle") && (
        <div className="flex flex-col p-2">
          {/* Body */}
          <div className="flex items-center px-2">
            <p className="min-w-[90px]">Body:</p>
            <input
              className="m-2 flex-1 bg-blue-50 p-2 outline-none"
              {...register("postBody", { required: true })}
              type="text"
              placeholder="Text (optional)"
            />
          </div>
          {/* Subreddit */}
          {!subreddit && (
            <div className="flex items-center px-2">
              <p className="min-w-[90px]">Subreddit:</p>
              <input
                className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                {...register("subreddit", { required: true })}
                type="text"
                placeholder="i.e. nextjs"
              />
            </div>
          )}

          {/* Image box */}
          {imgBoxOpen && (
            <div className="flex items-center px-2">
              <p className="min-w-[90px]">Image URL:</p>
              <input
                className="m-2 flex-1 bg-blue-50 p-2 outline-none"
                {...register("postImage")}
                type="text"
                placeholder="Optional"
              />
            </div>
          )}
          {/* Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="space-y-2 p-2 text-red-500">
              {errors.postTitle?.type === "required" && (
                <p>A post title is required.</p>
              )}
              {errors.subreddit?.type === "required" && (
                <p>A subreddit is required.</p>
              )}
              {errors.postBody?.type === "required" && (
                <p>A post body is required.</p>
              )}
            </div>
          )}
          {!!watch("postTitle") && (
            // <button className=" bg-blue-400 p-2 text-white">Create post</button>
            <div>
              <button
                type="submit"
                className="bg-blue-400 p-2 text-white rounded-md"
              >
                Create a post
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
};

export default Postbox;
